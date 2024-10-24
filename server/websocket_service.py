import json
import logging
from typing import Dict, Any, Optional
import gevent
from geventwebsocket.websocket import WebSocket

logger = logging.getLogger(__name__)

class WebSocketService:
    def __init__(self, ssh_service=None):
        self.connections = {}
        self.ssh_service = ssh_service
        logger.info("WebSocket service initialized")

    def handle_connection(self, websocket: WebSocket, path: str):
        try:
            # Parse path to determine connection type and parameters
            parts = path.strip('/').split('/')
            if not parts:
                return

            connection_type = parts[0]

            if connection_type == 'terminal':
                if len(parts) >= 3:
                    server_name = parts[1]
                    container_id = parts[2]
                    self.handle_terminal(websocket, server_name, container_id)
            elif connection_type == 'logs':
                if len(parts) >= 3:
                    server_name = parts[1]
                    container_id = parts[2]
                    self.handle_logs(websocket, server_name, container_id)
            elif connection_type == 'events':
                self.handle_events(websocket)
            else:
                logger.warning(f"Unknown connection type: {connection_type}")

        except Exception as e:
            logger.error(f"Error handling WebSocket connection: {e}")

    def handle_terminal(self, websocket: WebSocket, server_name: str, container_id: str):
        try:
            if not self.ssh_service:
                raise Exception("SSH service not initialized")

            # Get SSH connection
            ssh_client = self.ssh_service.connect(server_name)
            if not ssh_client:
                websocket.send(json.dumps({
                    'type': 'error',
                    'data': f'Failed to connect to server {server_name}'
                }))
                return

            # Create interactive shell session
            channel = ssh_client.invoke_shell()
            channel.setblocking(0)

            try:
                # Send initial command to attach to container
                channel.send(f'docker exec -it {container_id} /bin/sh\n')

                while not websocket.closed:
                    # Handle incoming messages from the web client
                    try:
                        message = websocket.receive()
                        if message is None:  # WebSocket closed
                            break
                        data = json.loads(message)
                        if data['type'] == 'input':
                            channel.send(data['data'])
                    except Exception as e:
                        logger.error(f"Error handling terminal input: {e}")
                        break

                    # Send terminal output back to the web client
                    try:
                        if channel.recv_ready():
                            output = channel.recv(4096).decode('utf-8', errors='replace')
                            websocket.send(json.dumps({
                                'type': 'terminal',
                                'data': output
                            }))
                    except Exception as e:
                        logger.error(f"Error handling terminal output: {e}")
                        break

                    gevent.sleep(0.1)

            finally:
                channel.close()

        except Exception as e:
            logger.error(f"Error in terminal handler: {e}")
            try:
                websocket.send(json.dumps({
                    'type': 'error',
                    'data': str(e)
                }))
            except:
                pass

    def handle_logs(self, websocket: WebSocket, server_name: str, container_id: str):
        try:
            if not self.ssh_service:
                raise Exception("SSH service not initialized")

            # Get SSH connection
            ssh_client = self.ssh_service.connect(server_name)
            if not ssh_client:
                websocket.send(json.dumps({
                    'type': 'error',
                    'data': f'Failed to connect to server {server_name}'
                }))
                return

            # Create channel for logs
            channel = ssh_client.get_transport().open_session()
            channel.exec_command(f'docker logs -f {container_id}')

            try:
                while not websocket.closed:
                    if channel.recv_ready():
                        output = channel.recv(4096).decode('utf-8', errors='replace')
                        websocket.send(json.dumps({
                            'type': 'log',
                            'data': output
                        }))
                    elif channel.exit_status_ready():
                        break
                    gevent.sleep(0.1)
            finally:
                channel.close()

        except Exception as e:
            logger.error(f"Error in logs handler: {e}")
            try:
                websocket.send(json.dumps({
                    'type': 'error',
                    'data': str(e)
                }))
            except:
                pass

    def handle_events(self, websocket: WebSocket):
        try:
            if not self.ssh_service:
                raise Exception("SSH service not initialized")

            # Monitor events from all connected servers
            servers = self.ssh_service.load_servers()
            event_channels = {}

            try:
                for server in servers:
                    ssh_client = self.ssh_service.connect(server['name'])
                    if ssh_client:
                        channel = ssh_client.get_transport().open_session()
                        channel.exec_command('docker events --format "{{json .}}"')
                        event_channels[server['name']] = channel

                while not websocket.closed:
                    for server_name, channel in event_channels.items():
                        if channel.recv_ready():
                            output = channel.recv(4096).decode('utf-8', errors='replace')
                            for line in output.splitlines():
                                try:
                                    event = json.loads(line)
                                    event['server_name'] = server_name
                                    websocket.send(json.dumps(event))
                                except json.JSONDecodeError:
                                    continue

                    gevent.sleep(0.1)

            finally:
                for channel in event_channels.values():
                    channel.close()

        except Exception as e:
            logger.error(f"Error in events handler: {e}")
            try:
                websocket.send(json.dumps({
                    'type': 'error',
                    'data': str(e)
                }))
            except:
                pass
