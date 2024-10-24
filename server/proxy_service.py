import os
import logging
import glob
from typing import Dict, List, Optional
import re

logger = logging.getLogger(__name__)

class ProxyService:
    def __init__(self):
        self.proxy_dir = os.getenv('PROXY_DIR', '/mnt/user/appdata/swag/nginx/proxy-confs')
        logger.info(f"Proxy service initialized with directory: {self.proxy_dir}")

    def get_proxy_configs(self) -> List[Dict[str, str]]:
        configs = []
        try:
            conf_files = glob.glob(os.path.join(self.proxy_dir, '*.subdomain.conf'))

            for conf_file in conf_files:
                with open(conf_file, 'r') as f:
                    content = f.read()

                    # Extract domain from server_name directive
                    domain_match = re.search(r'server_name\s+([^;]+);', content)
                    domain = domain_match.group(1).strip() if domain_match else None

                    # Extract upstream from proxy_pass directive
                    upstream_match = re.search(r'proxy_pass\s+([^;]+);', content)
                    upstream = upstream_match.group(1).strip() if upstream_match else None

                    if domain and upstream:
                        configs.append({
                            'name': os.path.basename(conf_file),
                            'domain': domain,
                            'upstream': upstream,
                            'enabled': not conf_file.endswith('.sample')
                        })

        except Exception as e:
            logger.error(f"Error reading proxy configs: {e}")

        return configs

    def enable_proxy(self, config_name: str) -> bool:
        try:
            sample_path = os.path.join(self.proxy_dir, f"{config_name}.sample")
            enabled_path = os.path.join(self.proxy_dir, config_name)

            if os.path.exists(sample_path):
                os.rename(sample_path, enabled_path)
                logger.info(f"Enabled proxy config: {config_name}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error enabling proxy config: {e}")
            return False

    def disable_proxy(self, config_name: str) -> bool:
        try:
            enabled_path = os.path.join(self.proxy_dir, config_name)
            sample_path = os.path.join(self.proxy_dir, f"{config_name}.sample")

            if os.path.exists(enabled_path):
                os.rename(enabled_path, sample_path)
                logger.info(f"Disabled proxy config: {config_name}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error disabling proxy config: {e}")
            return False
