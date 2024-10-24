import paramiko
import logging
from typing import Dict, List, Any, Optional, Tuple
import yaml
import os
from pathlib import Path
import glob
import threading
import time
from contextlib import contextmanager
from .utils.logger import LoggerSetup, with_error_handling
from .utils.config import config

logger = LoggerSetup.setup_logger(__name__)

class SSHConnectionPool:
    """Manages a pool of SSH connections with automatic cleanup."""

    def __init__(self, max_connections: int = 10, cleanup_interval: int = 300):
        self.max_connections = max_connections
        self.cleanup_interval = cleanup_interval
        self.connections: Dict[str, List[Tuple[paramiko.SSHClient, float]]] = {}
        self.lock = threading.Lock()
        self._start_cleanup_thread()

    def _start_cleanup_thread(self) -> None:
        """Start background thread for cleaning up idle connections."""
        def cleanup_worker():
            while True:
                time.sleep(self.cleanup_interval)
                self.cleanup_idle_connections()

        thread = threading.Thread(target=cleanup_worker, daemon=True)
        thread.start()

    def cleanup_idle_connections(self, max_idle_time: int = 600) -> None:
        """Clean up connections that have been idle for too long."""
        current_time = time.time()
        with self.lock:
            for server_name in list(self.connections.keys()):
                connections = self.connections[server_name]
                active_connections = []
                for client, last_used in connections:
                    if current_time - last_used > max_idle_time:
                        try:
                            client.close()
                            logger.debug(f"Closed idle connection to {server_name}")
                        except Exception as e:
                            logger.error(f"Error closing connection to {server_name}: {e}")
                    else:
                        active_connections.append((client, last_used))
                if active_connections:
                    self.connections[server_name] = active_connections
                else:
                    del self.connections[server_name]

    @contextmanager
    def get_connection(self, server_name: str, connect_func: callable) -> paramiko.SSHClient:
        """Get a connection from the pool or create a new one."""
        connection = None
        try:
            with self.lock:
                if server_name in self.connections and self.connections[server_name]:
                    connection, _ = self.connections[server_name].pop()
                    try:
                        # Test if connection is still alive
                        connection.get_transport().send_ignore()
                        logger.debug(f"Reusing existing connection to {server_name}")
                    except Exception:
                        logger.debug(f"Connection to {server_name} is dead, creating new one")
                        connection = None

                if connection is None:
                    connection = connect_func()
                    logger.debug(f"Created new connection to {server_name}")

            yield connection

            # Return connection to pool
            with self.lock:
                if server_name not in self.connections:
                    self.connections[server_name] = []
                if len(self.connections[server_name]) < self.max_connections:
                    self.connections[server_name].append((connection, time.time()))
                    connection = None  # Don't close it

        finally:
            if connection is not None:
                try:
                    connection.close()
                except Exception as e:
                    logger.error(f"Error closing connection to {server_name}: {e}")

class SSHService:
    """Manages SSH connections and operations with servers."""

    def __init__(self):
        self.ssh_dir = os.getenv('SSH_DIR', '/root/.ssh')
        logger.info(f"Initializing SSH service with SSH_DIR: {self.ssh_dir}")
        self.connection_pool = SSHConnectionPool()
        logger.info("SSH service initialized")

    def find_key_for_host(self, hostname: str) -> Optional[str]:
        """Find a matching private key for a host based on public key files."""
        try:
            logger.debug(f"Looking for SSH key for host: {hostname}")
            # Look for keys in the SSH directory
            for pub_key in glob.glob(os.path.join(self.ssh_dir, '*.pub')):
                logger.debug(f"Found public key: {pub_key}")
                private_key = pub_key[:-4]  # Remove .pub extension
                if os.path.exists(private_key):
                    logger.debug(f"Found corresponding private key: {private_key}")
                    with open(pub_key, 'r') as f:
                        if hostname in f.read():
                            logger.info(f"Found matching key for {hostname}: {private_key}")
                            return private_key

            default_key = os.path.join(self.ssh_dir, 'id_rsa')
            if os.path.exists(default_key):
                logger.debug(f"Using default key: {default_key}")
                return default_key

            logger.debug(f"No SSH key found for host: {hostname}")
            return None
        except Exception as e:
            logger.error(f"Error finding key for host {hostname}: {e}")
            return None

    @with_error_handling(logger=logger, context="get_suggested_servers")
    def get_suggested_servers(self) -> List[Dict[str, Any]]:
        """Get list of configured servers."""
        return config.servers

    def _create_connection(self, server: Dict[str, Any]) -> paramiko.SSHClient:
        """Create a new SSH connection."""
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

        return client

    @with_error_handling(logger=logger, context="connect")
    def connect(self, server_name: str) -> Optional[paramiko.SSHClient]:
        """Get a connection to the specified server."""
        server = config.get_server(server_name)
        if not server:
            raise ValueError(f"Server {server_name} not found")

        def connect_func():
            return self._create_connection(server)

        return self.connection_pool.get_connection(server_name, connect_func)

    @with_error_handling(logger=logger, context="execute_command")
    def execute_command(self, server_name: str, command: str) -> Dict[str, Any]:
        """Execute a command on the specified server."""
        with self.connect(server_name) as client:
            if not client:
                raise Exception("Failed to connect to server")

            stdin, stdout, stderr = client.exec_command(command)
            return {
                'exit_code': stdout.channel.recv_exit_status(),
                'output': stdout.read().decode(),
                'error': stderr.read().decode()
            }

    @with_error_handling(logger=logger, context="get_container_status")
    def get_container_status(self, server_name: str, container_id: str) -> Dict[str, Any]:
        """Get status information for a container."""
        result = self.execute_command(server_name, f"docker inspect {container_id}")
        if result['exit_code'] != 0:
            raise Exception(result['error'])

        container_info = yaml.safe_load(result['output'])[0]
        stats_result = self.execute_command(
            server_name,
            f"docker stats {container_id} --no-stream --format '{{{{json .}}}}'"
        )
        if stats_result['exit_code'] != 0:
            raise Exception(stats_result['error'])

        stats = yaml.safe_load(stats_result['output'])
        return {
            'running': container_info['State']['Running'],
            'status': container_info['State']['Status'],
            'health': container_info['State'].get('Health', {}).get('Status', 'N/A'),
            'restarts': container_info['RestartCount'],
            'cpu_usage': stats['CPUPerc'],
            'memory_usage': f"{stats['MemUsage']}",
            'memory_percent': stats['MemPerc']
        }

    @with_error_handling(logger=logger, context="get_services")
    def get_services(self, server_name: str, compose_dir: str) -> List[Dict[str, Any]]:
        """Get information about Docker services on the server."""
        result = self.execute_command(
            server_name,
            f"find {compose_dir} -name docker-compose.yml"
        )
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

            try:
                compose_data = yaml.safe_load(result['output'])
                if not compose_data or 'services' not in compose_data:
                    continue

                stack_name = os.path.basename(os.path.dirname(compose_file))
                stack_services = []

                for service_name, service_data in compose_data['services'].items():
                    container_result = self.execute_command(
                        server_name,
                        f"docker ps -aqf name=^{stack_name}_{service_name}$"
                    )
                    container_id = container_result['output'].strip() if container_result['exit_code'] == 0 else None

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
                        'compose_content': result['output'],
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
