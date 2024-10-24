import logging
from typing import Dict, Any, Optional, List
import os
import re
import yaml
from datetime import datetime, timedelta
import threading
from dataclasses import dataclass
from collections import defaultdict
from .utils.logger import LoggerSetup, with_error_handling
from .utils.config import config

logger = LoggerSetup.setup_logger(__name__)

@dataclass
class ProxyConfig:
    """Configuration for a proxy entry."""
    source: str
    target: str
    ssl: bool
    enabled: bool
    custom_config: Dict[str, Any]
    last_modified: datetime

class ProxyService:
    """Service for managing Nginx proxy configurations."""

    def __init__(self, config_dir: Optional[str] = None):
        self.config_dir = config_dir or config.directory_paths.get('proxy', '/mnt/user/appdata/swag/nginx/proxy-confs')
        self._configs: Dict[str, ProxyConfig] = {}
        self._config_lock = threading.Lock()
        self._template_cache: Dict[str, str] = {}
        self._last_scan: Optional[datetime] = None
        self._scan_interval = timedelta(minutes=5)
        self._start_scan_thread()
        logger.info(f"Proxy service initialized with config dir: {self.config_dir}")

    def _start_scan_thread(self) -> None:
        """Start background thread for scanning config changes."""
        def scan_worker():
            while True:
                try:
                    self._scan_configs()
                except Exception as e:
                    logger.error(f"Error scanning proxy configs: {e}")
                finally:
                    threading.Event().wait(300)  # Sleep for 5 minutes

        thread = threading.Thread(target=scan_worker, daemon=True)
        thread.start()

    @with_error_handling(logger=logger, context="scan_configs")
    def _scan_configs(self) -> None:
        """Scan for changes in proxy configurations."""
        current_time = datetime.utcnow()
        if self._last_scan and current_time - self._last_scan < self._scan_interval:
            return

        with self._config_lock:
            # Scan existing config files
            for filename in os.listdir(self.config_dir):
                if not filename.endswith('.conf'):
                    continue

                filepath = os.path.join(self.config_dir, filename)
                last_modified = datetime.fromtimestamp(os.path.getmtime(filepath))

                # Skip if config hasn't changed
                if filename in self._configs:
                    if last_modified <= self._configs[filename].last_modified:
                        continue

                try:
                    with open(filepath, 'r') as f:
                        content = f.read()

                    config = self._parse_config(content)
                    if config:
                        config.last_modified = last_modified
                        self._configs[filename] = config
                        logger.debug(f"Updated proxy config: {filename}")
                except Exception as e:
                    logger.error(f"Error parsing proxy config {filename}: {e}")

            # Remove configs that no longer exist
            for filename in list(self._configs.keys()):
                if not os.path.exists(os.path.join(self.config_dir, filename)):
                    del self._configs[filename]
                    logger.debug(f"Removed proxy config: {filename}")

            self._last_scan = current_time

    def _parse_config(self, content: str) -> Optional[ProxyConfig]:
        """Parse Nginx configuration content."""
        try:
            # Extract server_name
            server_name_match = re.search(r'server_name\s+(.+?);', content)
            if not server_name_match:
                return None
            source = server_name_match.group(1).strip()

            # Extract proxy_pass
            proxy_pass_match = re.search(r'proxy_pass\s+(.+?);', content)
            if not proxy_pass_match:
                return None
            target = proxy_pass_match.group(1).strip()

            # Check if SSL is enabled
            ssl = 'ssl' in content and 'listen 443 ssl' in content

            # Check if config is enabled (not commented out)
            enabled = not content.lstrip().startswith('#')

            # Extract custom configurations
            custom_config = {
                'client_max_body_size': self._extract_value(content, 'client_max_body_size'),
                'proxy_read_timeout': self._extract_value(content, 'proxy_read_timeout'),
                'proxy_connect_timeout': self._extract_value(content, 'proxy_connect_timeout'),
                'proxy_send_timeout': self._extract_value(content, 'proxy_send_timeout')
            }

            return ProxyConfig(
                source=source,
                target=target,
                ssl=ssl,
                enabled=enabled,
                custom_config=custom_config,
                last_modified=datetime.utcnow()
            )
        except Exception as e:
            logger.error(f"Error parsing proxy configuration: {e}")
            return None

    def _extract_value(self, content: str, directive: str) -> Optional[str]:
        """Extract value for a specific Nginx directive."""
        match = re.search(rf'{directive}\s+(.+?);', content)
        return match.group(1).strip() if match else None

    @with_error_handling(logger=logger, context="get_configs")
    def get_configs(self, force_scan: bool = False) -> List[Dict[str, Any]]:
        """Get all proxy configurations."""
        if force_scan:
            self._scan_configs()

        configs = []
        with self._config_lock:
            for filename, config in self._configs.items():
                configs.append({
                    'filename': filename,
                    'source': config.source,
                    'target': config.target,
                    'ssl': config.ssl,
                    'enabled': config.enabled,
                    'custom_config': config.custom_config,
                    'last_modified': config.last_modified.isoformat()
                })

        return configs

    @with_error_handling(logger=logger, context="get_config")
    def get_config(self, filename: str) -> Optional[Dict[str, Any]]:
        """Get a specific proxy configuration."""
        with self._config_lock:
            config = self._configs.get(filename)
            if config:
                return {
                    'filename': filename,
                    'source': config.source,
                    'target': config.target,
                    'ssl': config.ssl,
                    'enabled': config.enabled,
                    'custom_config': config.custom_config,
                    'last_modified': config.last_modified.isoformat()
                }
        return None

    @with_error_handling(logger=logger, context="create_config")
    def create_config(
        self,
        filename: str,
        source: str,
        target: str,
        ssl: bool = True,
        custom_config: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Create a new proxy configuration."""
        if not filename.endswith('.conf'):
            filename += '.conf'

        filepath = os.path.join(self.config_dir, filename)
        if os.path.exists(filepath):
            raise ValueError(f"Configuration {filename} already exists")

        template = self._get_template('proxy.conf.template')
        if not template:
            raise ValueError("Proxy template not found")

        config_content = template.format(
            server_name=source,
            proxy_pass=target,
            ssl_config=self._get_ssl_config() if ssl else '',
            **self._format_custom_config(custom_config or {})
        )

        try:
            with open(filepath, 'w') as f:
                f.write(config_content)

            # Force scan to update internal state
            self._scan_configs()
            return True
        except Exception as e:
            logger.error(f"Error creating proxy config {filename}: {e}")
            return False

    @with_error_handling(logger=logger, context="update_config")
    def update_config(
        self,
        filename: str,
        source: Optional[str] = None,
        target: Optional[str] = None,
        ssl: Optional[bool] = None,
        custom_config: Optional[Dict[str, Any]] = None,
        enabled: Optional[bool] = None
    ) -> bool:
        """Update an existing proxy configuration."""
        if not filename.endswith('.conf'):
            filename += '.conf'

        filepath = os.path.join(self.config_dir, filename)
        if not os.path.exists(filepath):
            raise ValueError(f"Configuration {filename} not found")

        with self._config_lock:
            current_config = self._configs.get(filename)
            if not current_config:
                raise ValueError(f"Configuration {filename} not loaded")

            template = self._get_template('proxy.conf.template')
            if not template:
                raise ValueError("Proxy template not found")

            new_config_content = template.format(
                server_name=source or current_config.source,
                proxy_pass=target or current_config.target,
                ssl_config=self._get_ssl_config() if ssl or (ssl is None and current_config.ssl) else '',
                **self._format_custom_config({**(current_config.custom_config), **(custom_config or {})})
            )

            if enabled is False:
                new_config_content = f"# {new_config_content}"

            try:
                with open(filepath, 'w') as f:
                    f.write(new_config_content)

                # Force scan to update internal state
                self._scan_configs()
                return True
            except Exception as e:
                logger.error(f"Error updating proxy config {filename}: {e}")
                return False

    @with_error_handling(logger=logger, context="delete_config")
    def delete_config(self, filename: str) -> bool:
        """Delete a proxy configuration."""
        if not filename.endswith('.conf'):
            filename += '.conf'

        filepath = os.path.join(self.config_dir, filename)
        if not os.path.exists(filepath):
            raise ValueError(f"Configuration {filename} not found")

        try:
            os.remove(filepath)
            with self._config_lock:
                if filename in self._configs:
                    del self._configs[filename]
            return True
        except Exception as e:
            logger.error(f"Error deleting proxy config {filename}: {e}")
            return False

    def _get_template(self, template_name: str) -> Optional[str]:
        """Get template content from cache or load it."""
        if template_name in self._template_cache:
            return self._template_cache[template_name]

        template_path = os.path.join(os.path.dirname(__file__), 'templates', template_name)
        if not os.path.exists(template_path):
            logger.error(f"Template not found: {template_name}")
            return None

        try:
            with open(template_path, 'r') as f:
                template = f.read()
            self._template_cache[template_name] = template
            return template
        except Exception as e:
            logger.error(f"Error loading template {template_name}: {e}")
            return None

    def _get_ssl_config(self) -> str:
        """Get SSL configuration template."""
        return """
    listen 443 ssl;
    ssl_certificate /config/keys/cert.crt;
    ssl_certificate_key /config/keys/cert.key;
    include /config/nginx/ssl.conf;
"""

    def _format_custom_config(self, custom_config: Dict[str, Any]) -> Dict[str, str]:
        """Format custom configuration values."""
        formatted = {}
        for key, value in custom_config.items():
            if value is not None:
                formatted[key] = f"{key} {value};"
            else:
                formatted[key] = ""
        return formatted
