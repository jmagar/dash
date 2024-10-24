import logging
import docker
from typing import Dict, Any, List, Optional
import time
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class MetricsService:
    def __init__(self):
        self.client = docker.from_env()
        self.metrics_history: Dict[str, List[Dict[str, Any]]] = {}
        self.history_limit = 100  # Keep last 100 data points

    def get_container_metrics(self, container_id: str) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            stats = container.stats(stream=False)

            # Calculate CPU usage
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
            cpu_usage = (cpu_delta / system_delta) * 100 * len(stats['cpu_stats']['cpu_usage']['percpu_usage'])

            # Calculate memory usage
            memory_usage = stats['memory_stats']['usage']
            memory_limit = stats['memory_stats']['limit']
            memory_percent = (memory_usage / memory_limit) * 100

            # Network stats
            network_stats = {
                'rx_bytes': 0,
                'tx_bytes': 0,
                'rx_packets': 0,
                'tx_packets': 0
            }

            if 'networks' in stats:
                for interface in stats['networks'].values():
                    network_stats['rx_bytes'] += interface.get('rx_bytes', 0)
                    network_stats['tx_bytes'] += interface.get('tx_bytes', 0)
                    network_stats['rx_packets'] += interface.get('rx_packets', 0)
                    network_stats['tx_packets'] += interface.get('tx_packets', 0)

            # Block I/O stats
            io_stats = {
                'read_bytes': 0,
                'write_bytes': 0,
                'read_ops': 0,
                'write_ops': 0
            }

            if 'blkio_stats' in stats:
                for stat in stats['blkio_stats'].get('io_service_bytes_recursive', []):
                    if stat['op'] == 'Read':
                        io_stats['read_bytes'] += stat['value']
                    elif stat['op'] == 'Write':
                        io_stats['write_bytes'] += stat['value']

                for stat in stats['blkio_stats'].get('io_serviced_recursive', []):
                    if stat['op'] == 'Read':
                        io_stats['read_ops'] += stat['value']
                    elif stat['op'] == 'Write':
                        io_stats['write_ops'] += stat['value']

            metrics = {
                'timestamp': datetime.now().isoformat(),
                'cpu': {
                    'usage_percent': cpu_usage,
                    'throttling_data': stats['cpu_stats'].get('throttling_data', {}),
                },
                'memory': {
                    'usage': memory_usage,
                    'limit': memory_limit,
                    'percent': memory_percent,
                    'stats': stats['memory_stats'].get('stats', {})
                },
                'network': network_stats,
                'io': io_stats
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

    def get_metrics_history(self, container_id: str, duration: Optional[timedelta] = None) -> List[Dict[str, Any]]:
        try:
            if container_id not in self.metrics_history:
                return []

            if duration is None:
                return self.metrics_history[container_id]

            cutoff = datetime.now() - duration
            return [
                metric for metric in self.metrics_history[container_id]
                if datetime.fromisoformat(metric['timestamp']) > cutoff
            ]

        except Exception as e:
            logger.error(f"Error getting metrics history: {e}")
            return []

    def get_system_metrics(self) -> Dict[str, Any]:
        try:
            info = self.client.info()

            return {
                'containers': {
                    'total': info['Containers'],
                    'running': info['ContainersRunning'],
                    'paused': info['ContainersPaused'],
                    'stopped': info['ContainersStopped']
                },
                'images': info['Images'],
                'docker_version': info['ServerVersion'],
                'memory': {
                    'total': info['MemTotal'],
                    'kernel': info.get('KernelMemory', 0)
                },
                'cpu': {
                    'cores': info['NCPU'],
                    'architecture': info['Architecture']
                },
                'driver': {
                    'name': info['Driver'],
                    'data': info.get('DriverStatus', [])
                }
            }

        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {
                'error': str(e)
            }
