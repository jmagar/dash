from flask import request
from typing import Dict, Any
from . import BaseRouter, JsonResponse
from ..utils.logger import with_error_handling
from ..ssh_service import SSHService
from ..metrics_service import MetricsService
from ..notification_service import NotificationService

class ContainerRouter(BaseRouter):
    """
    Handle container-related routes including status, logs, updates, and metrics.
    """

    def __init__(self):
        super().__init__()
        self.ssh_service = SSHService()
        self.metrics_service = MetricsService(ssh_service=self.ssh_service)
        self.notification_service = NotificationService()
        self.blueprint = self.create_blueprint('containers', __name__)
        self._register_routes()

    def _register_routes(self):
        """Register all container-related routes."""
        routes = [
            ('/container/<server_name>/<container_id>/status', ['GET'], self.container_status),
            ('/container/<server_name>/<container_id>/logs', ['GET'], self.container_logs),
            ('/container/<server_name>/<container_id>/update', ['POST'], self.update_container),
            ('/container/<server_name>/<container_id>/metrics', ['GET'], self.container_metrics),
            ('/container/<server_name>/<container_id>/metrics/history', ['GET'], self.container_metrics_history),
            ('/system/<server_name>/metrics', ['GET'], self.system_metrics),
        ]

        for path, methods, handler in routes:
            self.blueprint.route(path, methods=methods)(handler)

    @with_error_handling(raise_error=False)
    def container_status(self, server_name: str, container_id: str) -> JsonResponse:
        """Get container status information."""
        status = self.ssh_service.get_container_status(server_name, container_id)
        if not status.get('running', False):
            return self.error_response(
                f"Container {container_id} not running",
                404,
                status
            )
        return self.success_response(status)

    @with_error_handling(raise_error=False)
    def container_logs(self, server_name: str, container_id: str) -> JsonResponse:
        """Get container logs."""
        result = self.ssh_service.execute_command(
            server_name,
            f"docker logs --tail 100 {container_id}"
        )

        if result['exit_code'] != 0:
            return self.error_response(
                f"Failed to get logs for container {container_id}",
                500,
                result['error']
            )

        return self.success_response({
            'logs': result['output']
        })

    @with_error_handling(raise_error=False)
    def update_container(self, server_name: str, container_id: str) -> JsonResponse:
        """Update a container by pulling new image and recreating."""
        result = self.ssh_service.execute_command(
            server_name,
            f"docker-compose pull && docker-compose up -d {container_id}"
        )

        if result['exit_code'] == 0:
            self.notification_service.send_notification(
                f"Container {container_id} updated successfully"
            )
            return self.success_response(
                message=f"Container {container_id} updated successfully"
            )

        return self.error_response(
            f"Failed to update container {container_id}",
            500,
            result['error']
        )

    @with_error_handling(raise_error=False)
    def container_metrics(self, server_name: str, container_id: str) -> JsonResponse:
        """Get current container metrics."""
        metrics = self.metrics_service.get_container_metrics(server_name, container_id)
        return self.success_response(metrics)

    @with_error_handling(raise_error=False)
    def container_metrics_history(self, server_name: str, container_id: str) -> JsonResponse:
        """Get historical container metrics."""
        duration = request.args.get('duration')
        if duration:
            try:
                duration = int(duration)
            except ValueError:
                return self.error_response(
                    "Invalid duration parameter",
                    400
                )

        metrics = self.metrics_service.get_metrics_history(container_id, duration)
        return self.success_response(metrics)

    @with_error_handling(raise_error=False)
    def system_metrics(self, server_name: str) -> JsonResponse:
        """Get system-wide metrics for a server."""
        metrics = self.metrics_service.get_system_metrics(server_name)
        return self.success_response(metrics)

# Create blueprint instance
container_routes = ContainerRouter().blueprint
