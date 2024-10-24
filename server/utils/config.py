import os
import yaml
from typing import Dict, Any, Optional, List
from .base import setup_base_logger

logger = setup_base_logger(__name__)

class ConfigValidationError(Exception):
    """Raised when configuration validation fails."""
    pass

class ConfigManager:
    """Manages application configuration with validation and defaults."""

    REQUIRED_SECTIONS = ['python', 'gunicorn', 'server', 'logging', 'directories']

    def __init__(self):
        self._config: Dict[str, Any] = {}
        self._servers: List[Dict[str, Any]] = []
        self.load_config()

    def setup_logging(self) -> None:
        """Set up logging configuration."""
        logging_config = self.logging_config
        log_level = logging_config.get('level', 'INFO').upper()
        log_format = logging_config.get('format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')

        # Configure root logger
        root_logger = setup_base_logger(
            'root',
            level=getattr(setup_base_logger, log_level),
            format_str=log_format
        )

        # Set level for specific loggers
        for logger_name, logger_config in logging_config.get('loggers', {}).items():
            logger_level = logger_config.get('level', 'INFO').upper()
            logger = setup_base_logger(
                logger_name,
                level=getattr(setup_base_logger, logger_level),
                format_str=log_format
            )

        logger.info("Logging configured successfully")

    def load_config(self) -> None:
        """Load and validate all configuration files."""
        try:
            # Load main config
            config_path = os.path.join('config', 'config.yaml')
            if not os.path.exists(config_path):
                raise ConfigValidationError(f"Configuration file not found: {config_path}")

            with open(config_path, 'r') as f:
                self._config = yaml.safe_load(f) or {}

            self._validate_config()

            # Load servers config
            servers_path = os.path.join('config', 'servers.yaml')
            if os.path.exists(servers_path):
                with open(servers_path, 'r') as f:
                    self._servers = yaml.safe_load(f) or []

            logger.info("Configuration loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            raise

    def _validate_config(self) -> None:
        """Validate configuration structure and required fields."""
        # Check required sections
        missing_sections = [section for section in self.REQUIRED_SECTIONS
                          if section not in self._config]
        if missing_sections:
            raise ConfigValidationError(
                f"Missing required configuration sections: {', '.join(missing_sections)}"
            )

        # Validate Python section
        python_config = self._config.get('python', {})
        if not isinstance(python_config.get('path'), str):
            raise ConfigValidationError("Python path must be a string")

        # Validate Gunicorn section
        gunicorn_config = self._config.get('gunicorn', {})
        if not isinstance(gunicorn_config.get('bind'), str):
            raise ConfigValidationError("Gunicorn bind must be a string")
        if not isinstance(gunicorn_config.get('workers'), int):
            raise ConfigValidationError("Gunicorn workers must be an integer")

        # Validate Server section
        server_config = self._config.get('server', {})
        if not isinstance(server_config.get('host'), str):
            raise ConfigValidationError("Server host must be a string")
        if not isinstance(server_config.get('port'), int):
            raise ConfigValidationError("Server port must be an integer")

        # Validate Logging section
        logging_config = self._config.get('logging', {})
        if not isinstance(logging_config.get('level'), str):
            raise ConfigValidationError("Logging level must be a string")
        if not isinstance(logging_config.get('format'), str):
            raise ConfigValidationError("Logging format must be a string")

        # Validate Directories section
        directories = self._config.get('directories', {})
        required_dirs = ['compose', 'proxy', 'logs', 'config']
        missing_dirs = [dir_name for dir_name in required_dirs
                       if dir_name not in directories]
        if missing_dirs:
            raise ConfigValidationError(
                f"Missing required directory configurations: {', '.join(missing_dirs)}"
            )

    def _validate_server_config(self, server: Dict[str, Any]) -> None:
        """Validate individual server configuration."""
        required_fields = ['name', 'type']
        missing_fields = [field for field in required_fields
                         if field not in server]
        if missing_fields:
            raise ConfigValidationError(
                f"Missing required server fields: {', '.join(missing_fields)}"
            )

        if server['type'] == 'ssh':
            ssh_fields = ['host', 'port', 'username']
            missing_ssh_fields = [field for field in ssh_fields
                                if field not in server]
            if missing_ssh_fields:
                raise ConfigValidationError(
                    f"Missing required SSH fields: {', '.join(missing_ssh_fields)}"
                )

            if not isinstance(server['port'], int):
                raise ConfigValidationError(f"Port must be an integer for server {server['name']}")

            if not any([server.get('password'), server.get('key_path')]):
                raise ConfigValidationError(
                    f"Either password or key_path must be provided for server {server['name']}"
                )

        elif server['type'] == 'docker_socket':
            if 'socket_path' not in server:
                server['socket_path'] = '/var/run/docker.sock'

        elif server['type'] == 'docker_remote':
            if 'docker_host' not in server:
                raise ConfigValidationError(
                    f"Docker host is required for remote connection {server['name']}"
                )

            if server.get('use_tls'):
                tls_fields = ['cert_path', 'key_path', 'ca_path']
                missing_tls_fields = [field for field in tls_fields
                                    if field not in server]
                if missing_tls_fields:
                    raise ConfigValidationError(
                        f"Missing required TLS fields: {', '.join(missing_tls_fields)}"
                    )

    @property
    def python_config(self) -> Dict[str, Any]:
        """Get Python configuration."""
        return self._config.get('python', {})

    @property
    def gunicorn_config(self) -> Dict[str, Any]:
        """Get Gunicorn configuration."""
        return self._config.get('gunicorn', {})

    @property
    def server_config(self) -> Dict[str, Any]:
        """Get server configuration."""
        return self._config.get('server', {})

    @property
    def logging_config(self) -> Dict[str, Any]:
        """Get logging configuration."""
        return self._config.get('logging', {})

    @property
    def directory_paths(self) -> Dict[str, str]:
        """Get directory paths."""
        return self._config.get('directories', {})

    @property
    def servers(self) -> List[Dict[str, Any]]:
        """Get configured servers."""
        return self._servers

    def get_server(self, name: str) -> Optional[Dict[str, Any]]:
        """Get server configuration by name."""
        return next(
            (server for server in self._servers if server['name'] == name),
            None
        )

    def add_server(self, server_config: Dict[str, Any]) -> None:
        """Add a new server configuration."""
        self._validate_server_config(server_config)
        self._servers.append(server_config)
        self.save_servers()

    def remove_server(self, name: str) -> bool:
        """Remove a server configuration."""
        initial_length = len(self._servers)
        self._servers = [s for s in self._servers if s['name'] != name]
        if len(self._servers) < initial_length:
            self.save_servers()
            return True
        return False

    def save_servers(self) -> None:
        """Save server configurations to file."""
        try:
            servers_path = os.path.join('config', 'servers.yaml')
            with open(servers_path, 'w') as f:
                yaml.safe_dump(self._servers, f, default_flow_style=False)
        except Exception as e:
            logger.error(f"Failed to save server configurations: {e}")
            raise

# Create global config instance
config = ConfigManager()
