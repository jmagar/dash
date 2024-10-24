import logging
from typing import Dict, Any, Optional, List
import time
from datetime import datetime, timedelta
import threading
from dataclasses import dataclass
from collections import defaultdict
import json
from .utils.logger import LoggerSetup, with_error_handling
from .ssh_service import SSHService
from .utils.config import config

logger = LoggerSetup.setup_logger(__name__)

@dataclass
class MetricCache:
    """Cache entry for metrics data."""
    data: Any
    timestamp: datetime
    ttl: int  # Time to live in seconds

class MetricsService:
    """Service for collecting and managing system metrics."""

    def __init__(self, ssh_service: SSHService, cache_ttl: int = 60):
        self.ssh_service = ssh_service
        self.cache_ttl = cache_ttl
        self._cache: Dict[str, MetricCache] = {}
        self._cache_lock = threading.Lock()
        self._collection_lock = threading.Lock()
        self._metric_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self._history_max_size = 1000  # Maximum number of historical entries to keep
        self._start_cache_cleanup_thread()
        logger.info("Metrics service initialized")

    def _start_cache_cleanup_thread(self) -> None:
        """Start background thread for cleaning up expired cache entries."""
        def cleanup_worker():
            while True:
                self._cleanup_cache()
                time.sleep(300)  # Run cleanup every 5 minutes

        thread = threading.Thread(target=cleanup_worker, daemon=True)
        thread.start()

    def _cleanup_cache(self) -> None:
        """Remove expired cache entries."""
        current_time = datetime.utcnow()
        with self._cache_lock:
            for key in list(self._cache.keys()):
                cache_entry = self._cache[key]
                if (current_time - cache_entry.timestamp).seconds > cache_entry.ttl:
                    del self._cache[key]
                    logger.debug(f"Removed expired cache entry: {key}")

    def _get_cache_key(self, metric_type: str, server_name: str, **params: Any) -> str:
        """Generate a cache key for metrics data."""
        param_str = json.dumps(params, sort_keys=True)
        return f"{metric_type}:{server_name}:{param_str}"

    def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get data from cache if not expired."""
        with self._cache_lock:
            if cache_key in self._cache:
                cache_entry = self._cache[cache_key]
                if (datetime.utcnow() - cache_entry.timestamp).seconds <= cache_entry.ttl:
                    logger.debug(f"Cache hit: {cache_key}")
                    return cache_entry.data
                else:
                    del self._cache[cache_key]
        return None

    def _store_in_cache(self, cache_key: str, data: Any, ttl: Optional[int] = None) -> None:
        """Store data in cache."""
        with self._cache_lock:
            self._cache[cache_key] = MetricCache(
                data=data,
                timestamp=datetime.utcnow(),
                ttl=ttl or self.cache_ttl
            )

    def _store_in_history(self, metric_type: str, server_name: str, data: Any) -> None:
        """Store metrics data in historical record."""
        key = f"{metric_type}:{server_name}"
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'data': data
        }

        with self._collection_lock:
            self._metric_history[key].append(entry)
            # Trim history if it exceeds maximum size
            if len(self._metric_history[key]) > self._history_max_size:
                self._metric_history[key] = self._metric_history[key][-self._history_max_size:]

    @with_error_handling(logger=logger, context="get_system_metrics")
    def get_system_metrics(self, server_name: str) -> Dict[str, Any]:
        """Get system-level metrics for a server."""
        cache_key = self._get_cache_key('system', server_name)
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data

        commands = {
            'cpu': "top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}'",
            'memory': "free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2}'",
            'disk': "df -h / | awk 'NR==2{print $5}' | sed 's/%//g'",
            'load': "uptime | awk -F'[a-z]:' '{ print $2}'"
        }

        metrics = {}
        for metric, command in commands.items():
            result = self.ssh_service.execute_command(server_name, command)
            if result['exit_code'] == 0:
                try:
                    value = float(result['output'].strip())
                    metrics[metric] = value
                except ValueError:
                    metrics[metric] = result['output'].strip()

        self._store_in_cache(cache_key, metrics)
        self._store_in_history('system', server_name, metrics)
        return metrics

    @with_error_handling(logger=logger, context="get_docker_metrics")
    def get_docker_metrics(self, server_name: str) -> Dict[str, Any]:
        """Get Docker-related metrics for a server."""
        cache_key = self._get_cache_key('docker', server_name)
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data

        # Get container stats
        result = self.ssh_service.execute_command(
            server_name,
            "docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}'"
        )

        metrics = {'containers': []}
        if result['exit_code'] == 0:
            for line in result['output'].strip().split('\n'):
                if line:
                    name, cpu, mem, net, block = line.split('\t')
                    metrics['containers'].append({
                        'name': name,
                        'cpu_usage': cpu.rstrip('%'),
                        'memory_usage': mem.rstrip('%'),
                        'network_io': net,
                        'block_io': block
                    })

        # Get system-wide Docker metrics
        info_result = self.ssh_service.execute_command(server_name, "docker info --format '{{json .}}'")
        if info_result['exit_code'] == 0:
            try:
                docker_info = json.loads(info_result['output'])
                metrics['info'] = {
                    'containers': docker_info.get('Containers', 0),
                    'images': docker_info.get('Images', 0),
                    'storage_driver': docker_info.get('Driver', ''),
                    'running_containers': docker_info.get('ContainersRunning', 0),
                    'paused_containers': docker_info.get('ContainersPaused', 0),
                    'stopped_containers': docker_info.get('ContainersStopped', 0)
                }
            except json.JSONDecodeError:
                logger.error("Failed to parse Docker info JSON")

        self._store_in_cache(cache_key, metrics)
        self._store_in_history('docker', server_name, metrics)
        return metrics

    @with_error_handling(logger=logger, context="get_service_metrics")
    def get_service_metrics(self, server_name: str, service_name: str) -> Dict[str, Any]:
        """Get metrics for a specific service."""
        cache_key = self._get_cache_key('service', server_name, service=service_name)
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data

        result = self.ssh_service.execute_command(
            server_name,
            f"docker stats --no-stream --format '{{{{json .}}}}' {service_name}"
        )

        metrics = {}
        if result['exit_code'] == 0:
            try:
                stats = json.loads(result['output'])
                metrics = {
                    'cpu_usage': stats.get('CPUPerc', '0%'),
                    'memory_usage': stats.get('MemPerc', '0%'),
                    'memory_usage_raw': stats.get('MemUsage', ''),
                    'network_io': stats.get('NetIO', ''),
                    'block_io': stats.get('BlockIO', ''),
                    'pids': stats.get('PIDs', '0')
                }
            except json.JSONDecodeError:
                logger.error(f"Failed to parse service metrics JSON for {service_name}")

        self._store_in_cache(cache_key, metrics)
        self._store_in_history('service', f"{server_name}:{service_name}", metrics)
        return metrics

    @with_error_handling(logger=logger, context="get_metrics_history")
    def get_metrics_history(
        self,
        metric_type: str,
        server_name: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get historical metrics data."""
        key = f"{metric_type}:{server_name}"

        with self._collection_lock:
            history = self._metric_history.get(key, [])

            if start_time or end_time:
                filtered_history = []
                for entry in history:
                    entry_time = datetime.fromisoformat(entry['timestamp'])
                    if start_time and entry_time < start_time:
                        continue
                    if end_time and entry_time > end_time:
                        continue
                    filtered_history.append(entry)
                return filtered_history

            return history

    def clear_cache(self) -> None:
        """Clear all cached metrics data."""
        with self._cache_lock:
            self._cache.clear()
        logger.info("Metrics cache cleared")
