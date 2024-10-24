from . import BaseRouter, JsonResponse
from ..utils.logger import with_error_handling
from ..proxy_service import ProxyService
from ..notification_service import NotificationService

class ProxyRouter(BaseRouter):
    """
    Handle proxy-related routes including configuration management.
    """

    def __init__(self):
        super().__init__()
        self.proxy_service = ProxyService()
        self.notification_service = NotificationService()
        self.blueprint = self.create_blueprint('proxy', __name__)
        self._register_routes()

    def _register_routes(self):
        """Register all proxy-related routes."""
        routes = [
            ('/proxy/configs', ['GET'], self.list_configs),
            ('/proxy/<config_name>/enable', ['POST'], self.enable_config),
            ('/proxy/<config_name>/disable', ['POST'], self.disable_config),
        ]

        for path, methods, handler in routes:
            self.blueprint.route(path, methods=methods)(handler)

    @with_error_handling(raise_error=False)
    def list_configs(self) -> JsonResponse:
        """List all available proxy configurations."""
        try:
            configs = self.proxy_service.get_proxy_configs()
            return self.success_response({
                'configs': configs
            })
        except Exception as e:
            return self.error_response(
                "Failed to get proxy configurations",
                500,
                str(e)
            )

    @with_error_handling(raise_error=False)
    def enable_config(self, config_name: str) -> JsonResponse:
        """Enable a proxy configuration."""
        try:
            success = self.proxy_service.enable_proxy(config_name)
            if success:
                self.notification_service.send_notification(
                    f"Proxy config {config_name} enabled"
                )
                return self.success_response(
                    message=f"Proxy config {config_name} enabled successfully"
                )
            return self.error_response(
                f"Failed to enable proxy config {config_name}",
                500
            )
        except Exception as e:
            return self.error_response(
                f"Error enabling proxy config {config_name}",
                500,
                str(e)
            )

    @with_error_handling(raise_error=False)
    def disable_config(self, config_name: str) -> JsonResponse:
        """Disable a proxy configuration."""
        try:
            success = self.proxy_service.disable_proxy(config_name)
            if success:
                self.notification_service.send_notification(
                    f"Proxy config {config_name} disabled"
                )
                return self.success_response(
                    message=f"Proxy config {config_name} disabled successfully"
                )
            return self.error_response(
                f"Failed to disable proxy config {config_name}",
                500
            )
        except Exception as e:
            return self.error_response(
                f"Error disabling proxy config {config_name}",
                500,
                str(e)
            )

# Create blueprint instance
proxy_routes = ProxyRouter().blueprint
