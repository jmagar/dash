import os
import logging
import glob
from typing import Dict, List, Optional, Any
import re
from pathlib import Path

logger = logging.getLogger(__name__)

class ProxyService:
    def __init__(self):
        self.proxy_dir = os.getenv('PROXY_DIR', '/mnt/user/appdata/swag/nginx/proxy-confs')
        if not os.path.exists(self.proxy_dir):
            logger.error(f"Proxy directory does not exist: {self.proxy_dir}")
            raise FileNotFoundError(f"Proxy directory not found: {self.proxy_dir}")
        logger.info(f"Proxy service initialized with directory: {self.proxy_dir}")

    def get_proxy_configs(self) -> List[Dict[str, str]]:
        configs = []
        try:
            if not os.path.exists(self.proxy_dir):
                logger.error(f"Proxy directory not found: {self.proxy_dir}")
                return configs

            conf_files = glob.glob(os.path.join(self.proxy_dir, '*.subdomain.conf'))
            logger.debug(f"Found {len(conf_files)} proxy configuration files")

            for conf_file in conf_files:
                try:
                    if not os.path.isfile(conf_file):
                        logger.warning(f"Skipping non-file entry: {conf_file}")
                        continue

                    with open(conf_file, 'r') as f:
                        content = f.read()

                        # Extract domain from server_name directive
                        domain_match = re.search(r'server_name\s+([^;]+);', content)
                        domain = domain_match.group(1).strip() if domain_match else None

                        # Extract upstream from proxy_pass directive
                        upstream_match = re.search(r'proxy_pass\s+([^;]+);', content)
                        upstream = upstream_match.group(1).strip() if upstream_match else None

                        # Extract SSL configuration
                        ssl_enabled = 'ssl_certificate' in content
                        auth_enabled = 'auth_request' in content

                        if domain and upstream:
                            configs.append({
                                'name': os.path.basename(conf_file),
                                'domain': domain,
                                'upstream': upstream,
                                'enabled': not conf_file.endswith('.sample'),
                                'ssl_enabled': ssl_enabled,
                                'auth_enabled': auth_enabled
                            })
                        else:
                            logger.warning(f"Skipping invalid config file: {conf_file} (missing domain or upstream)")

                except Exception as e:
                    logger.error(f"Error processing config file {conf_file}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error reading proxy configs: {e}")

        return configs

    def enable_proxy(self, config_name: str) -> bool:
        try:
            if not config_name:
                logger.error("Config name cannot be empty")
                return False

            sample_path = os.path.join(self.proxy_dir, f"{config_name}.sample")
            enabled_path = os.path.join(self.proxy_dir, config_name)

            if not os.path.exists(sample_path):
                logger.error(f"Sample config not found: {sample_path}")
                return False

            if os.path.exists(enabled_path):
                logger.warning(f"Config already enabled: {enabled_path}")
                return True

            os.rename(sample_path, enabled_path)
            logger.info(f"Enabled proxy config: {config_name}")
            return True

        except Exception as e:
            logger.error(f"Error enabling proxy config: {e}")
            return False

    def disable_proxy(self, config_name: str) -> bool:
        try:
            if not config_name:
                logger.error("Config name cannot be empty")
                return False

            enabled_path = os.path.join(self.proxy_dir, config_name)
            sample_path = os.path.join(self.proxy_dir, f"{config_name}.sample")

            if not os.path.exists(enabled_path):
                logger.error(f"Enabled config not found: {enabled_path}")
                return False

            if os.path.exists(sample_path):
                logger.warning(f"Sample config already exists: {sample_path}")
                return True

            os.rename(enabled_path, sample_path)
            logger.info(f"Disabled proxy config: {config_name}")
            return True

        except Exception as e:
            logger.error(f"Error disabling proxy config: {e}")
            return False

    def get_proxy_status(self, config_name: str) -> Dict[str, Any]:
        try:
            if not config_name:
                logger.error("Config name cannot be empty")
                return {
                    'enabled': False,
                    'ssl_enabled': False,
                    'auth_enabled': False,
                    'last_modified': None,
                    'error': 'Config name is empty'
                }

            config_path = os.path.join(self.proxy_dir, config_name)
            sample_path = os.path.join(self.proxy_dir, f"{config_name}.sample")

            if os.path.exists(config_path):
                try:
                    with open(config_path, 'r') as f:
                        content = f.read()
                        return {
                            'enabled': True,
                            'ssl_enabled': 'ssl_certificate' in content,
                            'auth_enabled': 'auth_request' in content,
                            'last_modified': os.path.getmtime(config_path)
                        }
                except Exception as e:
                    logger.error(f"Error reading config file {config_path}: {e}")
                    return {
                        'enabled': True,
                        'ssl_enabled': False,
                        'auth_enabled': False,
                        'last_modified': None,
                        'error': f"Error reading config: {str(e)}"
                    }

            elif os.path.exists(sample_path):
                try:
                    with open(sample_path, 'r') as f:
                        content = f.read()
                        return {
                            'enabled': False,
                            'ssl_enabled': 'ssl_certificate' in content,
                            'auth_enabled': 'auth_request' in content,
                            'last_modified': os.path.getmtime(sample_path)
                        }
                except Exception as e:
                    logger.error(f"Error reading sample config file {sample_path}: {e}")
                    return {
                        'enabled': False,
                        'ssl_enabled': False,
                        'auth_enabled': False,
                        'last_modified': None,
                        'error': f"Error reading sample config: {str(e)}"
                    }

            else:
                logger.error(f"Config not found: {config_name}")
                return {
                    'enabled': False,
                    'ssl_enabled': False,
                    'auth_enabled': False,
                    'last_modified': None,
                    'error': 'Config not found'
                }

        except Exception as e:
            logger.error(f"Error getting proxy status: {e}")
            return {
                'enabled': False,
                'ssl_enabled': False,
                'auth_enabled': False,
                'last_modified': None,
                'error': str(e)
            }
