import os
import sys
import yaml
import logging
from typing import Dict, Any, Optional, List
from .base import setup_base_logger

logger = setup_base_logger(__name__)

class ConfigValidationError(Exception):
    """Raised when configuration validation fails."""
    pass

class ConfigManager:
    """Manages application configuration with validation and defaults."""

    REQUIRED_SECTIONS = ['python', 'server', 'logging', 'directories']

    def __init__(self):
        self._config: Dict[str, Any] = {}
        self._servers: List[Dict[str, Any]] = []
        self.load_config()
        self._setup_python_env()

    def _setup_python_env(self) -> None:
        """Set up Python environment based on configuration."""
        python_config = self.python_config

        # Set Python path if not already in sys.path
        python_path = python_config.get('path')
        if python_path and python_path not in sys.path:
            sys.path.insert(0, python_path)
            logger.debug(f"Added {python_path} to Python path")

        # Set unbuffered output if configured
        if python_config.get('unbuffered'):
            os.environ['PYTHONUNBUFFERED'] = '1'
            logger.debug("Set Python output to unbuffered")

    def setup_logging(self) -> None:
        """Set up logging configuration."""
        logging_config = self.logging_config
        log_level = os.getenv('LOG_LEVEL', logging_config.get('level', 'INFO')).upper()
        log_format = logging_config.get('format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')

        # Configure root logger
        root_logger = setup_base_logger(
            'root',
            level=getattr(logging, log_level),
            format_str=log_format
        )

        # Set level for specific loggers
        for logger_name, logger_config in logging_config.get('loggers', {}).items():
            logger_level = os.getenv(f'LOG_LEVEL_{logger_name.upper()}', logger_config.get('level', 'INFO')).upper()
            logger = setup_base_logger(
                logger_name,
                level=getattr(logging, logger_level),
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

            # Load servers config
            servers_path = os.path.join('config', 'servers.yaml')
            if os.path.exists(servers_path):
                with open(servers_path, 'r') as f:
                    self._servers = yaml.safe_load(f) or []

            # Validate base config before env overrides
            self._validate_config()

            # Override with environment variables
            self._override_with_env()

            logger.info("Configuration loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            raise

    def _override_with_env(self) -> None:
        """Override configuration values with environment variables."""
        # Server settings
        if 'FLASK_ENV' in os.environ:
            self._config.setdefault('server', {})['environment'] = os.environ['FLASK_ENV']
        if 'FLASK_DEBUG' in os.environ:
            self._config.setdefault('server', {})['debug'] = os.environ['FLASK_DEBUG'].lower() == 'true'

        # Directory paths
        if 'COMPOSE_DIR' in os.environ:
            self._config.setdefault('directories', {})['compose'] = os.environ['COMPOSE_DIR']
        if 'PROXY_DIR' in os.environ:
            self._config.setdefault('directories', {})['proxy'] = os.environ['PROXY_DIR']

        # Docker settings
        if 'DOCKER_SOCKET' in os.environ:
            self._config.setdefault('docker', {})['socket_path'] = os.environ['DOCKER_SOCKET']

        # Notification settings
        if any(key in os.environ for key in ['GOTIFY_URL', 'GOTIFY_TOKEN']):
            notifications = self._config.setdefault('notifications', {})
            gotify = notifications.setdefault('gotify', {})
            if 'GOTIFY_URL' in os.environ:
                gotify['url'] = os.environ['GOTIFY_URL']
            if 'GOTIFY_TOKEN' in os.environ:
                gotify['token'] = os.environ['GOTIFY_TOKEN']

        # GitHub backup settings
        if any(key in os.environ for key in ['GITHUB_USERNAME', 'GITHUB_TOKEN', 'GITHUB_REPO']):
            backup = self._config.setdefault('backup', {})
            github = backup.setdefault('github', {})
            if 'GITHUB_USERNAME' in os.environ:
                github['username'] = os.environ['GITHUB_USERNAME']
            if 'GITHUB_TOKEN' in os.environ:
                github['token'] = os.environ['GITHUB_TOKEN']
            if 'GITHUB_REPO' in os.environ:
                github['repo'] = os.environ['GITHUB_REPO']

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
    def docker_config(self) -> Dict[str, Any]:
        """Get Docker configuration."""
        return self._config.get('docker', {})

    @property
    def notification_config(self) -> Dict[str, Any]:
        """Get notification configuration."""
        return self._config.get('notifications', {}).get('gotify', {})

    @property
    def backup_config(self) -> Dict[str, Any]:
        """Get backup configuration."""
        return self._config.get('backup', {}).get('github', {})

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
