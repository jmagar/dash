from flask import request
from flask_sock import Sock
from typing import Dict, Any, Optional
from . import BaseRouter
from ..utils.logger import LoggerSetup, with_error_handling
from ..websocket_service import WebSocketService
from ..ssh_service import SSHService

logger = LoggerSetup.setup_logger(__name__)

class WebSocketRouter(BaseRouter):
    """
    Handle WebSocket connections for terminal sessions and live updates.
    """

    def __init__(self, sock: Sock):
        super().__init__()
        self.sock = sock
        self.ssh_service = SSHService()
        self.websocket_service = WebSocketService()
        self._register_routes()

    def _register_routes(self):
        """Register WebSocket routes."""
        self.sock.route('/terminal/<server_name>')(self.terminal_session)
        self.sock.route('/health')(self.health_check)
        self.sock.route('/events')(self.event_stream)

    @with_error_handling(logger=logger, context="terminal_session")
    def terminal_session(self, ws, server_name: str):
        """Handle terminal WebSocket session."""
        try:
            # Get SSH client for the server
            client = self.ssh_service.connect(server_name)
            if not client:
                ws.send(f"Failed to connect to server {server_name}")
                return

            # Create SSH channel for terminal
            channel = client.invoke_shell()
            channel.setblocking(0)

            # Set terminal size if provided
            size = request.args.get('size')
            if size:
                try:
                    width, height = map(int, size.split('x'))
                    channel.resize_pty(width=width, height=height)
                except ValueError:
                    logger.warning(f"Invalid terminal size format: {size}")

            while True:
                # Handle incoming messages from client
                try:
                    message = ws.receive()
                    if message:
                        if message.startswith('resize:'):
                            # Handle terminal resize
                            try:
                                _, size = message.split(':')
                                width, height = map(int, size.split('x'))
                                channel.resize_pty(width=width, height=height)
                            except (ValueError, IndexError):
                                logger.warning(f"Invalid resize message: {message}")
                        else:
                            # Send regular input to terminal
                            channel.send(message)
                except Exception as e:
                    logger.error(f"Error receiving WebSocket message: {e}")
                    break

                # Send terminal output to client
                if channel.recv_ready():
                    output = channel.recv(4096).decode('utf-8', errors='replace')
                    ws.send(output)

                # Check for terminal errors
                if channel.recv_stderr_ready():
                    error = channel.recv_stderr(4096).decode('utf-8', errors='replace')
                    ws.send(error)

                # Check if channel is closed
                if channel.exit_status_ready():
                    break

        except Exception as e:
            logger.error(f"Terminal session error: {e}")
            ws.send(f"Session error: {str(e)}")

        finally:
            if 'channel' in locals():
                channel.close()

    @with_error_handling(logger=logger, context="health_check")
    def health_check(self, ws):
        """Handle health check WebSocket connection."""
        try:
            while True:
                message = ws.receive()
                if message == "ping":
                    ws.send("pong")
                elif message == "status":
                    status = self.websocket_service.get_status()
                    ws.send(status)
        except Exception as e:
            logger.error(f"Health check error: {e}")

    @with_error_handling(logger=logger, context="event_stream")
    def event_stream(self, ws):
        """Handle event stream WebSocket connection."""
        try:
            # Register client for events
            client_id = self.websocket_service.register_client(ws)

            try:
                while True:
                    # Keep connection alive and handle incoming messages
                    message = ws.receive()
                    if message:
                        self.websocket_service.handle_client_message(client_id, message)
            except Exception as e:
                logger.error(f"Event stream error: {e}")
            finally:
                # Unregister client when connection closes
                self.websocket_service.unregister_client(client_id)

        except Exception as e:
            logger.error(f"Event stream connection error: {e}")

    def broadcast_event(self, event_type: str, data: Any):
        """Broadcast event to all connected clients."""
        self.websocket_service.broadcast_event(event_type, data)
