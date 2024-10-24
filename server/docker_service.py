import docker
from typing import Dict, Optional
from .config import logger

# Store Docker clients
docker_clients: Dict[str, docker.DockerClient] = {
    'local': docker.from_env()
}

# Store active Docker client
active_client = 'local'

class DockerService:
    @staticmethod
    def get_container_status(container_id: str) -> dict:
        """Get detailed container status"""
        try:
            container = docker_clients[active_client].containers.get(container_id)
            logger.debug(f"Retrieved container {container_id}")

            state = container.attrs['State']
            stats = container.stats(stream=False)

            # Calculate CPU usage
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            cpu_percent = (cpu_delta / system_delta) * 100.0 if system_delta > 0 else 0.0

            # Calculate memory usage
            mem_usage = stats['memory_stats'].get('usage', 0)
            mem_limit = stats['memory_stats'].get('limit', 1)
            mem_percent = (mem_usage / mem_limit) * 100.0

            return {
                'status': state['Status'],
                'running': state['Running'],
                'started_at': state['StartedAt'],
                'health': state.get('Health', {}).get('Status', 'none'),
                'restarts': container.attrs['RestartCount'],
                'cpu_usage': f"{cpu_percent:.1f}%",
                'memory_usage': f"{mem_usage / (1024*1024):.1f}MB / {mem_limit / (1024*1024):.1f}MB",
                'memory_percent': f"{mem_percent:.1f}%"
            }
        except Exception as e:
            logger.error(f"Error getting container status for {container_id}: {e}")
            return {
                'status': 'error',
                'running': False,
                'error': str(e)
            }

    @staticmethod
    def get_container_logs(container_id: str, lines: int = 100) -> str:
        """Get container logs"""
        try:
            container = docker_clients[active_client].containers.get(container_id)
            return container.logs(tail=lines).decode('utf-8')
        except Exception as e:
            logger.error(f"Error getting container logs for {container_id}: {e}")
            return f"Error retrieving logs: {str(e)}"

    @staticmethod
    def update_container(container_id: str) -> dict:
        """Update a container (pull new image and recreate)"""
        try:
            container = docker_clients[active_client].containers.get(container_id)
            image_tag = container.image.tags[0]

            # Pull new image
            docker_clients[active_client].images.pull(image_tag)
            logger.info(f"Pulled new image for {container_id}")

            # Stop and remove container
            container.stop()
            container.remove()
            logger.info(f"Stopped and removed container {container_id}")

            # Container will be recreated by docker-compose
            return {"status": "success", "message": "Container updated successfully"}
        except Exception as e:
            logger.error(f"Error updating container {container_id}: {e}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    async def attach_terminal(websocket, container_id: str):
        """Attach to container's terminal"""
        try:
            container = docker_clients[active_client].containers.get(container_id)

            # Try to detect the available shell
            shells = ['/bin/bash', '/bin/ash', '/bin/sh']
            shell_cmd = None

            for shell in shells:
                try:
                    result = container.exec_run(f'which {shell}')
                    if result.exit_code == 0:
                        shell_cmd = shell
                        break
                except:
                    continue

            if not shell_cmd:
                shell_cmd = '/bin/sh'  # Fallback to sh

            # Create exec instance with detected shell
            exec_id = container.exec_run(
                cmd=shell_cmd,
                stdin=True,
                tty=True,
                privileged=True,
                user='root',  # Use root to ensure access
                socket=True
            )

            socket = exec_id.output

            async def reader():
                while True:
                    try:
                        data = await socket.recv()
                        if not data:
                            break
                        await websocket.send(data.decode())
                    except Exception as e:
                        logger.error(f"Error in terminal reader: {e}")
                        break

            async def writer():
                while True:
                    try:
                        data = await websocket.recv()
                        if not data:
                            break
                        socket.send(data.encode())
                    except Exception as e:
                        logger.error(f"Error in terminal writer: {e}")
                        break

            await asyncio.gather(reader(), writer())

        except Exception as e:
            logger.error(f"Error attaching to terminal for {container_id}: {e}")
            await websocket.send(f"Error: {str(e)}\n")
        finally:
            try:
                await websocket.close()
            except:
                pass

    @staticmethod
    def add_host(name: str, url: str, cert_path: Optional[str] = None) -> None:
        """Add a new Docker host"""
        client = docker.DockerClient(
            base_url=url,
            tls=cert_path
        )
        docker_clients[name] = client

    @staticmethod
    def switch_host(host: str) -> None:
        """Switch active Docker host"""
        if host not in docker_clients:
            raise ValueError(f"Host {host} not found")
        global active_client
        active_client = host

    @staticmethod
    def test_connection(url: str, cert_path: Optional[str] = None) -> None:
        """Test connection to Docker host"""
        client = docker.DockerClient(
            base_url=url,
            tls=cert_path
        )
        # Test connection by listing containers
        client.containers.list()
