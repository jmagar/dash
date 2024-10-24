import os
import re
from typing import Optional
from .config import logger

class ProxyConfig:
    @staticmethod
    def get_service_url(service_name: str) -> Optional[str]:
        """Extract service URL from proxy configuration"""
        proxy_dir = os.getenv('PROXY_DIR')
        proxy_file = os.path.join(proxy_dir, f"{service_name}.subdomain.conf")

        try:
            if os.path.exists(proxy_file):
                with open(proxy_file, 'r') as f:
                    content = f.read()
                    # Look for server_name directive
                    match = re.search(r'server_name\s+([^;]+);', content)
                    if match:
                        domain = match.group(1).strip()
                        return f"https://{domain}"
        except Exception as e:
            logger.error(f"Error reading proxy config for {service_name}: {e}")

        return None
