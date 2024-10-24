import logging
from typing import Dict, Any, List, Optional
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class MetricsService:
    def __init__(self, ssh_service=None):
        self.ssh_service = ssh_service
        self.metrics_history: Dict[str, List[Dict[str, Any]]] = {}
        self.history_limit = 100  # Keep last 100 data points

    def get_container_metrics(self, server_name: str, container_id: str) -> Dict[str, Any]:
        try:
            if not self.ssh_service:
                raise Exception("SSH service not initialized")

            # Get container stats using docker stats command
            result = self.ssh_service.execute_command(
                server_name,
                f"docker stats {container_id} --no-stream --format '{{{{json .}}}}'"
            )

            if result['exit_code'] != 0:
                raise Exception(result['error'])

            stats = json.loads(result['output'])

            metrics = {
                'timestamp': datetime.now().isoformat(),
                'cpu': {
                    'usage_percent': stats['CPUPerc'].rstrip('%'),
                },
                'memory': {
                    'usage': self._parse_size(stats['MemUsage'].split('/')[0]),
                    'limit': self._parse_size(stats['MemUsage'].split('/')[1]),
                    'percent': stats['MemPerc'].rstrip('%'),
                },
                'network': {
                    'io': stats.get('NetIO', '0B / 0B'),
                },
                'block_io': {
                    'io': stats.get('BlockIO', '0B / 0B'),
                }
            }

            # Store metrics in history
            if container_id not in self.metrics_history:
                self.metrics_history[container_id] = []

            self.metrics_history[container_id].append(metrics)

            # Trim history if needed
            if len(self.metrics_history[container_id]) > self.history_limit:
                self.metrics_history[container_id] = self.metrics_history[container_id][-self.history_limit:]

            return metrics

        except Exception as e:
            logger.error(f"Error getting container metrics: {e}")
            return {
                'error': str(e)
            }

    def get_metrics_history(self, container_id: str, duration: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            if container_id not in self.metrics_history:
                return []

            if duration is None:
                return self.metrics_history[container_id]

            cutoff = datetime.now() - timedelta(seconds=duration)
            return [
                metric for metric in self.metrics_history[container_id]
                if datetime.fromisoformat(metric['timestamp']) > cutoff
            ]

        except Exception as e:
            logger.error(f"Error getting metrics history: {e}")
            return []

    def get_system_metrics(self, server_name: str) -> Dict[str, Any]:
        try:
            if not self.ssh_service:
                raise Exception("SSH service not initialized")

            # Get Docker info
            result = self.ssh_service.execute_command(server_name, "docker info --format '{{json .}}'")
            if result['exit_code'] != 0:
                raise Exception(result['error'])

            info = json.loads(result['output'])

            # Get system memory info
            mem_result = self.ssh_service.execute_command(server_name, "free -b")
            if mem_result['exit_code'] == 0:
                mem_lines = mem_result['output'].strip().split('\n')
                if len(mem_lines) >= 2:
                    mem_values = mem_lines[1].split()
                    total_memory = int(mem_values[1])
                    used_memory = int(mem_values[2])
                    free_memory = int(mem_values[3])
            else:
                total_memory = 0
                used_memory = 0
                free_memory = 0

            return {
                'containers': {
                    'total': info.get('Containers', 0),
                    'running': info.get('ContainersRunning', 0),
                    'paused': info.get('ContainersPaused', 0),
                    'stopped': info.get('ContainersStopped', 0)
                },
                'images': info.get('Images', 0),
                'docker_version': info.get('ServerVersion', 'unknown'),
                'memory': {
                    'total': total_memory,
                    'used': used_memory,
                    'free': free_memory
                },
                'cpu': {
                    'cores': info.get('NCPU', 0),
                    'architecture': info.get('Architecture', 'unknown')
                },
                'driver': {
                    'name': info.get('Driver', 'unknown'),
                    'data': info.get('DriverStatus', [])
                }
            }

        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {
                'error': str(e)
            }

    def _parse_size(self, size_str: str) -> float:
        """Convert Docker size string to bytes"""
        try:
            value = float(''.join(filter(str.isdigit, size_str)))
            unit = ''.join(filter(str.isalpha, size_str)).upper()

            multipliers = {
                'B': 1,
                'KB': 1024,
                'MB': 1024 ** 2,
                'GB': 1024 ** 3,
                'TB': 1024 ** 4
            }

            return value * multipliers.get(unit, 1)
        except Exception:
            return 0
