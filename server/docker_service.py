import docker
import logging
from typing import Dict, List, Optional, Any
import yaml
import os
import glob
from pathlib import Path
import subprocess
import json
from docker.transport import SSLAdapter

logger = logging.getLogger(__name__)

class DockerService:
    def __init__(self):
        try:
            self.client = docker.from_env()
            logger.info("Docker client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise

    def get_socket_services(self, socket_path: str) -> List[Dict[str, Any]]:
        """Get services using Unix socket connection."""
        try:
            client = docker.DockerClient(base_url=f"unix://{socket_path}")
            return self.get_services(os.path.dirname(socket_path))
        except Exception as e:
            logger.error(f"Error connecting to Docker socket {socket_path}: {e}")
            return []

    def get_remote_services(
        self,
        docker_host: str,
        use_tls: bool = False,
        cert_path: Optional[str] = None,
        key_path: Optional[str] = None,
        ca_path: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get services using remote Docker connection."""
        try:
            tls_config = None
            if use_tls:
                if not all([cert_path, key_path, ca_path]):
                    raise ValueError("All TLS paths must be provided when TLS is enabled")
                tls_config = docker.tls.TLSConfig(
                    client_cert=(cert_path, key_path),
                    ca_cert=ca_path,
                    verify=True
                )

            client = docker.DockerClient(
                base_url=docker_host,
                tls=tls_config
            )
            # Use the base directory of the host URL for compose file searching
            compose_dir = '/'  # Default to root, can be configured if needed
            return self.get_services(compose_dir)
        except Exception as e:
            logger.error(f"Error connecting to remote Docker host {docker_host}: {e}")
            return []

    def get_container_status(self, container_id: str) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            stats = container.stats(stream=False)

            # Calculate CPU usage percentage
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
            cpu_usage = (cpu_delta / system_delta) * 100 * len(stats['cpu_stats']['cpu_usage']['percpu_usage'])

            # Calculate memory usage
            memory_usage = stats['memory_stats']['usage']
            memory_limit = stats['memory_stats']['limit']
            memory_percent = (memory_usage / memory_limit) * 100

            return {
                'running': container.status == 'running',
                'status': container.status,
                'health': container.attrs['State'].get('Health', {}).get('Status', 'N/A'),
                'restarts': container.attrs['RestartCount'],
                'cpu_usage': f"{cpu_usage:.1f}%",
                'memory_usage': f"{memory_usage / (1024*1024):.1f}MB / {memory_limit / (1024*1024):.1f}MB",
                'memory_percent': f"{memory_percent:.1f}"
            }
        except Exception as e:
            logger.error(f"Error getting container status: {e}")
            return {
                'running': False,
                'status': 'error',
                'health': 'error',
                'restarts': 0,
                'cpu_usage': '0%',
                'memory_usage': '0MB / 0MB',
                'memory_percent': '0'
            }

    def get_container_logs(self, container_id: str, tail: int = 100) -> str:
        try:
            container = self.client.containers.get(container_id)
            logs = container.logs(tail=tail, timestamps=True).decode('utf-8')
            return logs
        except Exception as e:
            logger.error(f"Error getting container logs: {e}")
            return f"Error getting logs: {str(e)}"

    def update_container(self, container_id: str) -> bool:
        try:
            container = self.client.containers.get(container_id)
            image_name = container.image.tags[0] if container.image.tags else container.image.id

            # Pull latest image
            self.client.images.pull(image_name)

            # Restart container
            container.restart()
            logger.info(f"Container {container.name} updated successfully")
            return True
        except Exception as e:
            logger.error(f"Error updating container: {e}")
            return False

    def execute_command(self, container_id: str, command: str) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            result = container.exec_run(command, tty=True)
            return {
                'exit_code': result.exit_code,
                'output': result.output.decode('utf-8')
            }
        except Exception as e:
            logger.error(f"Error executing command in container: {e}")
            return {
                'exit_code': -1,
                'output': f"Error: {str(e)}"
            }

    def get_services(self, compose_dir: str) -> List[Dict[str, Any]]:
        services = []
        try:
            # Get all docker-compose files
            compose_files = glob.glob(os.path.join(compose_dir, '**/docker-compose.yml'), recursive=True)

            for compose_file in compose_files:
                with open(compose_file, 'r') as f:
                    compose_content = f.read()
                    try:
                        compose_data = yaml.safe_load(compose_content)
                        if not compose_data or 'services' not in compose_data:
                            continue

                        stack_name = os.path.basename(os.path.dirname(compose_file))
                        stack_services = []

                        for service_name, service_data in compose_data['services'].items():
                            # Find container ID for this service
                            container_id = None
                            try:
                                containers = self.client.containers.list(
                                    all=True,
                                    filters={'name': f'{stack_name}_{service_name}'}
                                )
                                if containers:
                                    container_id = containers[0].id
                            except Exception as e:
                                logger.error(f"Error finding container for service {service_name}: {e}")

                            # Get service URL from labels or environment
                            service_url = None
                            if 'labels' in service_data:
                                for label in service_data['labels']:
                                    if 'traefik.http.routers' in label:
                                        service_url = f"https://{label.split('=')[1]}"
                                        break

                            service_info = {
                                'service_name': service_name,
                                'container_id': container_id,
                                'service_url': service_url,
                                'compose_file': compose_file,
                                'compose_content': compose_content,
                                'ports': service_data.get('ports', []),
                                'volumes': service_data.get('volumes', []),
                                'environment': service_data.get('environment', {}),
                                'networks': list(service_data.get('networks', {}).keys()),
                                'status': self.get_container_status(container_id) if container_id else None
                            }
                            stack_services.append(service_info)

                        services.append({
                            'stack_name': stack_name,
                            'compose_file': compose_file,
                            'services': stack_services
                        })
                    except yaml.YAMLError as e:
                        logger.error(f"Error parsing docker-compose file {compose_file}: {e}")
                        continue
                    except Exception as e:
                        logger.error(f"Error processing service {service_name}: {e}")
                        continue

        except Exception as e:
            logger.error(f"Error getting services: {e}")

        return services

    def get_container_terminal(self, container_id: str) -> Optional[str]:
        try:
            container = self.client.containers.get(container_id)
            exec_id = container.exec_run(
                cmd="/bin/sh",
                tty=True,
                stdin=True,
                socket=True
            ).id
            return exec_id
        except Exception as e:
            logger.error(f"Error creating terminal session: {e}")
            return None
