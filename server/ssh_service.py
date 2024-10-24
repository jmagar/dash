import paramiko
import logging
from typing import Dict, List, Any, Optional
import yaml
import os
import json
from pathlib import Path

logger = logging.getLogger(__name__)

class SSHService:
    def __init__(self):
        self.connections = {}
        self.config_file = 'config/servers.json'
        self.ensure_config_dir()
        self.load_servers()
        logger.info("SSH service initialized")

    def ensure_config_dir(self):
        config_dir = os.path.dirname(self.config_file)
        if not os.path.exists(config_dir):
            os.makedirs(config_dir)
        if not os.path.exists(self.config_file):
            with open(self.config_file, 'w') as f:
                json.dump([], f)

    def load_servers(self) -> List[Dict[str, Any]]:
        try:
            with open(self.config_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading servers: {e}")
            return []

    def save_servers(self, servers: List[Dict[str, Any]]) -> bool:
        try:
            with open(self.config_file, 'w') as f:
                json.dump(servers, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving servers: {e}")
            return False

    def add_server(self, name: str, host: str, port: int, username: str, password: str = None, key_path: str = None) -> bool:
        try:
            servers = self.load_servers()
            server = {
                'name': name,
                'host': host,
                'port': port,
                'username': username,
                'password': password,
                'key_path': key_path
            }
            servers.append(server)
            return self.save_servers(servers)
        except Exception as e:
            logger.error(f"Error adding server: {e}")
            return False

    def remove_server(self, name: str) -> bool:
        try:
            servers = self.load_servers()
            servers = [s for s in servers if s['name'] != name]
            return self.save_servers(servers)
        except Exception as e:
            logger.error(f"Error removing server: {e}")
            return False

    def connect(self, server_name: str) -> Optional[paramiko.SSHClient]:
        try:
            servers = self.load_servers()
            server = next((s for s in servers if s['name'] == server_name), None)
            if not server:
                raise ValueError(f"Server {server_name} not found")

            if server_name in self.connections:
                return self.connections[server_name]

            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            if server.get('key_path'):
                key = paramiko.RSAKey.from_private_key_file(server['key_path'])
                client.connect(
                    server['host'],
                    port=server['port'],
                    username=server['username'],
                    pkey=key
                )
            else:
                client.connect(
                    server['host'],
                    port=server['port'],
                    username=server['username'],
                    password=server['password']
                )

            self.connections[server_name] = client
            return client
        except Exception as e:
            logger.error(f"Error connecting to server {server_name}: {e}")
            return None

    def execute_command(self, server_name: str, command: str) -> Dict[str, Any]:
        try:
            client = self.connect(server_name)
            if not client:
                raise Exception("Failed to connect to server")

            stdin, stdout, stderr = client.exec_command(command)
            return {
                'exit_code': stdout.channel.recv_exit_status(),
                'output': stdout.read().decode(),
                'error': stderr.read().decode()
            }
        except Exception as e:
            logger.error(f"Error executing command on server {server_name}: {e}")
            return {
                'exit_code': -1,
                'output': '',
                'error': str(e)
            }

    def get_container_status(self, server_name: str, container_id: str) -> Dict[str, Any]:
        try:
            result = self.execute_command(server_name, f"docker inspect {container_id}")
            if result['exit_code'] != 0:
                raise Exception(result['error'])

            container_info = json.loads(result['output'])[0]
            stats_result = self.execute_command(server_name, f"docker stats {container_id} --no-stream --format '{{{{json .}}}}'")
            if stats_result['exit_code'] != 0:
                raise Exception(stats_result['error'])

            stats = json.loads(stats_result['output'])
            return {
                'running': container_info['State']['Running'],
                'status': container_info['State']['Status'],
                'health': container_info['State'].get('Health', {}).get('Status', 'N/A'),
                'restarts': container_info['RestartCount'],
                'cpu_usage': stats['CPUPerc'],
                'memory_usage': f"{stats['MemUsage']}",
                'memory_percent': stats['MemPerc']
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

    def get_services(self, server_name: str, compose_dir: str) -> List[Dict[str, Any]]:
        try:
            result = self.execute_command(server_name, f"find {compose_dir} -name docker-compose.yml")
            if result['exit_code'] != 0:
                raise Exception(result['error'])

            services = []
            compose_files = result['output'].strip().split('\n')

            for compose_file in compose_files:
                if not compose_file:
                    continue

                result = self.execute_command(server_name, f"cat {compose_file}")
                if result['exit_code'] != 0:
                    continue

                compose_content = result['output']
                try:
                    compose_data = yaml.safe_load(compose_content)
                    if not compose_data or 'services' not in compose_data:
                        continue

                    stack_name = os.path.basename(os.path.dirname(compose_file))
                    stack_services = []

                    for service_name, service_data in compose_data['services'].items():
                        # Find container ID for this service
                        container_result = self.execute_command(
                            server_name,
                            f"docker ps -aqf name=^{stack_name}_{service_name}$"
                        )
                        container_id = container_result['output'].strip() if container_result['exit_code'] == 0 else None

                        # Get service URL from labels or environment
                        service_url = None
                        if 'labels' in service_data:
                            for label in service_data['labels']:
                                if isinstance(label, str) and 'traefik.http.routers' in label:
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
                            'status': self.get_container_status(server_name, container_id) if container_id else None
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
                    logger.error(f"Error processing service: {e}")
                    continue

            return services
        except Exception as e:
            logger.error(f"Error getting services: {e}")
            return []

    def close(self, server_name: str = None):
        if server_name:
            if server_name in self.connections:
                self.connections[server_name].close()
                del self.connections[server_name]
        else:
            for client in self.connections.values():
                client.close()
            self.connections.clear()
