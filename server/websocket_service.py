import asyncio
import websockets
import logging
import json
from typing import Dict, Any, Optional
import docker
from docker.models.containers import Container

logger = logging.getLogger(__name__)

class WebSocketService:
    def __init__(self):
        self.client = docker.from_env()
        self.active_terminals: Dict[str, Any] = {}
        self.active_logs: Dict[str, Any] = {}

    async def handle_terminal(self, websocket, container_id: str):
        try:
            container = self.client.containers.get(container_id)
            exec_id = container.exec_run(
                cmd="/bin/sh",
                tty=True,
                stdin=True,
                socket=True
            ).id

            self.active_terminals[container_id] = exec_id

            try:
                while True:
                    message = await websocket.recv()
                    if not message:
                        break

                    # Send input to container
                    container.exec_start(
                        exec_id=exec_id,
                        tty=True,
                        stream=True,
                        socket=True,
                        demux=True
                    )

                    # Get output from container
                    output = container.exec_inspect(exec_id)
                    if output:
                        await websocket.send(json.dumps({
                            'type': 'terminal',
                            'data': output
                        }))
            finally:
                if container_id in self.active_terminals:
                    del self.active_terminals[container_id]

        except Exception as e:
            logger.error(f"Error in terminal websocket: {e}")
            await websocket.send(json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    async def handle_logs(self, websocket, container_id: str):
        try:
            container = self.client.containers.get(container_id)
            logs_stream = container.logs(stream=True, follow=True, timestamps=True)

            self.active_logs[container_id] = logs_stream

            try:
                for log in logs_stream:
                    await websocket.send(json.dumps({
                        'type': 'log',
                        'data': log.decode('utf-8')
                    }))
            finally:
                if container_id in self.active_logs:
                    del self.active_logs[container_id]

        except Exception as e:
            logger.error(f"Error in logs websocket: {e}")
            await websocket.send(json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    async def handle_metrics(self, websocket, container_id: str):
        try:
            container = self.client.containers.get(container_id)
            while True:
                try:
                    stats = container.stats(stream=False)

                    # Calculate CPU usage
                    cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
                    system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
                    cpu_usage = (cpu_delta / system_delta) * 100 * len(stats['cpu_stats']['cpu_usage']['percpu_usage'])

                    # Calculate memory usage
                    memory_usage = stats['memory_stats']['usage']
                    memory_limit = stats['memory_stats']['limit']
                    memory_percent = (memory_usage / memory_limit) * 100

                    await websocket.send(json.dumps({
                        'type': 'metrics',
                        'data': {
                            'cpu_usage': f"{cpu_usage:.1f}%",
                            'memory_usage': f"{memory_usage / (1024*1024):.1f}MB / {memory_limit / (1024*1024):.1f}MB",
                            'memory_percent': f"{memory_percent:.1f}%",
                            'network_rx': stats['networks']['eth0']['rx_bytes'] if 'networks' in stats else 0,
                            'network_tx': stats['networks']['eth0']['tx_bytes'] if 'networks' in stats else 0
                        }
                    }))

                    await asyncio.sleep(1)  # Update every second

                except Exception as e:
                    logger.error(f"Error getting container stats: {e}")
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'message': str(e)
                    }))
                    break

        except Exception as e:
            logger.error(f"Error in metrics websocket: {e}")
            await websocket.send(json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    async def handle_events(self, websocket):
        try:
            events = self.client.events(decode=True)
            for event in events:
                await websocket.send(json.dumps({
                    'type': 'event',
                    'data': event
                }))
        except Exception as e:
            logger.error(f"Error in events websocket: {e}")
            await websocket.send(json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    async def handle_connection(self, websocket, path: str):
        try:
            # Parse path to determine type of connection and container ID
            parts = path.strip('/').split('/')
            if len(parts) < 2:
                raise ValueError("Invalid WebSocket path")

            connection_type = parts[0]
            container_id = parts[1] if len(parts) > 1 else None

            if connection_type == 'terminal' and container_id:
                await self.handle_terminal(websocket, container_id)
            elif connection_type == 'logs' and container_id:
                await self.handle_logs(websocket, container_id)
            elif connection_type == 'metrics' and container_id:
                await self.handle_metrics(websocket, container_id)
            elif connection_type == 'events':
                await self.handle_events(websocket)
            else:
                raise ValueError(f"Unknown connection type: {connection_type}")

        except Exception as e:
            logger.error(f"Error handling websocket connection: {e}")
            try:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': str(e)
                }))
            except:
                pass
