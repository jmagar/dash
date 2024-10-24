from flask import Flask, jsonify, request
from geventwebsocket.handler import WebSocketHandler
from gevent.pywsgi import WSGIServer
import logging
import os
from typing import Optional, Dict, Any

from server.ssh_service import SSHService
from server.docker_service import DockerService
from server.websocket_service import WebSocketService
from server.metrics_service import MetricsService
from server.proxy_service import ProxyService
from server.utils.logger import LoggerSetup
from server.utils.config import config, ConfigValidationError
from server.routes import (
    server_routes,
    container_routes,
    proxy_routes,
    websocket_routes
)

logger = LoggerSetup.setup_logger(__name__)

class DashboardApp:
    """Main application class for the dashboard."""

    def __init__(self):
        self.app: Optional[Flask] = None
        self.ssh_service: Optional[SSHService] = None
        self.docker_service: Optional[DockerService] = None
        self.websocket_service: Optional[WebSocketService] = None
        self.metrics_service: Optional[MetricsService] = None
        self.proxy_service: Optional[ProxyService] = None

    def initialize(self) -> Flask:
        """Initialize the application and its services."""
        try:
            # Initialize Flask app
            self.app = Flask(__name__)
            self.app.config['SECRET_KEY'] = os.urandom(24)

            # Initialize services
            self._initialize_services()

            # Register error handlers
            self._register_error_handlers()

            # Register routes
            self._register_routes()

            logger.info("Application initialized successfully")
            return self.app

        except Exception as e:
            logger.error(f"Failed to initialize application: {e}")
            raise

    def _initialize_services(self) -> None:
        """Initialize application services."""
        try:
            # Initialize SSH service
            self.ssh_service = SSHService()

            # Initialize Docker service
            self.docker_service = DockerService()

            # Initialize WebSocket service
            self.websocket_service = WebSocketService()

            # Initialize Metrics service
            self.metrics_service = MetricsService(self.ssh_service)

            # Initialize Proxy service
            self.proxy_service = ProxyService()

            # Add services to Flask app context
            if self.app:
                self.app.ssh_service = self.ssh_service
                self.app.docker_service = self.docker_service
                self.app.websocket_service = self.websocket_service
                self.app.metrics_service = self.metrics_service
                self.app.proxy_service = self.proxy_service

        except Exception as e:
            logger.error(f"Failed to initialize services: {e}")
            raise

    def _register_error_handlers(self) -> None:
        """Register error handlers for the application."""
        if not self.app:
            raise RuntimeError("Flask app not initialized")

        @self.app.errorhandler(400)
        def bad_request(error: Any) -> tuple[Dict[str, Any], int]:
            return jsonify({
                'status': 'error',
                'message': str(error),
                'error_type': 'BadRequest'
            }), 400

        @self.app.errorhandler(404)
        def not_found(error: Any) -> tuple[Dict[str, Any], int]:
            return jsonify({
                'status': 'error',
                'message': str(error),
                'error_type': 'NotFound'
            }), 404

        @self.app.errorhandler(500)
        def internal_error(error: Any) -> tuple[Dict[str, Any], int]:
            logger.error(f"Internal server error: {error}")
            return jsonify({
                'status': 'error',
                'message': 'Internal server error',
                'error_type': 'InternalError'
            }), 500

        @self.app.errorhandler(ConfigValidationError)
        def config_error(error: Any) -> tuple[Dict[str, Any], int]:
            return jsonify({
                'status': 'error',
                'message': str(error),
                'error_type': 'ConfigurationError'
            }), 400

    def _register_routes(self) -> None:
        """Register application routes."""
        if not self.app:
            raise RuntimeError("Flask app not initialized")

        # Register blueprints
        self.app.register_blueprint(server_routes.bp)
        self.app.register_blueprint(container_routes.bp)
        self.app.register_blueprint(proxy_routes.bp)
        self.app.register_blueprint(websocket_routes.bp)

        # Register health check route
        @self.app.route('/health')
        def health_check() -> tuple[Dict[str, Any], int]:
            try:
                services_status = {
                    'ssh_service': bool(self.ssh_service),
                    'docker_service': bool(self.docker_service),
                    'websocket_service': bool(self.websocket_service),
                    'metrics_service': bool(self.metrics_service),
                    'proxy_service': bool(self.proxy_service)
                }

                return jsonify({
                    'status': 'success',
                    'message': 'Service is healthy',
                    'services': services_status
                }), 200

            except Exception as e:
                logger.error(f"Health check failed: {e}")
                return jsonify({
                    'status': 'error',
                    'message': 'Service is unhealthy',
                    'error': str(e)
                }), 500

        # Register WebSocket route
        @self.app.route('/ws')
        def websocket() -> Optional[str]:
            if not self.websocket_service:
                return 'WebSocket service not initialized'

            ws = request.environ.get('wsgi.websocket')
            if not ws:
                return 'WebSocket connection failed'

            client_id = self.websocket_service.register_client(ws)

            try:
                while not ws.closed:
                    message = ws.receive()
                    if message:
                        self.websocket_service.handle_client_message(client_id, message)

            except Exception as e:
                logger.error(f"WebSocket error: {e}")

            finally:
                self.websocket_service.unregister_client(client_id)

            return None

def create_app() -> Flask:
    """Create and configure the application."""
    dashboard = DashboardApp()
    return dashboard.initialize()

if __name__ == '__main__':
    app = create_app()

    # Get server configuration
    host = config.server_config.get('host', '0.0.0.0')
    port = config.server_config.get('port', 5000)

    print("Starting Dash Dashboard server")
    http_server = WSGIServer(
        (host, port),
        app,
        handler_class=WebSocketHandler
    )

    try:
        print("Server is ready")
        http_server.serve_forever()
    except KeyboardInterrupt:
        print("Server shutting down...")
    except Exception as e:
        print(f"Server error: {e}")
        raise
