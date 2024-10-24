from dotenv import load_dotenv
import os
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent
import time
import yaml
from typing import Optional
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
try:
    load_dotenv()
except Exception as e:
    logger.error(f"Failed to load .env file: {e}")
    raise

class ConfigurationError(Exception):
    """Raised when there's an issue with configuration settings."""
    pass

def check_directory(path: str, name: str) -> bool:
    """Check if directory exists and is accessible"""
    if not path:
        logger.error(f"{name} path not set in environment variables")
        return False
    if not os.path.exists(path):
        logger.error(f"{name} directory does not exist: {path}")
        return False
    if not os.path.isdir(path):
        logger.error(f"{name} path is not a directory: {path}")
        return False
    if not os.access(path, os.R_OK):
        logger.error(f"{name} directory is not readable: {path}")
        return False
    return True

class NotificationService:
    def __init__(self):
        self.gotify_url = os.getenv('GOTIFY_URL')
        self.gotify_token = os.getenv('GOTIFY_TOKEN')
        self.enabled = all([self.gotify_url, self.gotify_token])

        if not self.enabled:
            logger.info("Gotify notifications disabled - configuration incomplete")
        else:
            logger.info("Gotify notifications enabled")

    def send_notification(self, title: str, message: str, priority: int = 5) -> None:
        """Send a notification through Gotify service."""
        if not self.enabled:
            logger.debug(f"Notification skipped - Gotify disabled: {title}")
            return

        try:
            # Ensure URL ends with /message
            url = self.gotify_url.rstrip('/') + '/message'

            headers = {'X-Gotify-Key': self.gotify_token}
            payload = {
                'title': title,
                'message': message,
                'priority': priority
            }

            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=5
            )

            if response.status_code == 200:
                logger.info(f"Notification sent: {title}")
            else:
                logger.warning(
                    f"Failed to send notification (will continue running): "
                    f"Status {response.status_code}"
                )
        except requests.exceptions.RequestException as e:
            logger.warning(f"Error sending notification (will continue running): {str(e)}")
        except Exception as e:
            logger.warning(f"Unexpected error sending notification (will continue running): {str(e)}")

class ServiceConfigWatcher(FileSystemEventHandler):
    def __init__(self, compose_dir: str, proxy_dir: str):
        if not check_directory(compose_dir, "COMPOSE_DIR"):
            raise ConfigurationError(f"Invalid compose directory: {compose_dir}")
        if not check_directory(proxy_dir, "PROXY_DIR"):
            raise ConfigurationError(f"Invalid proxy directory: {proxy_dir}")

        self.compose_dir = compose_dir
        self.proxy_dir = proxy_dir
        self.notifier = NotificationService()
        self.yaml_extensions = ('.yml', '.yaml')
        self.conf_extensions = ('.conf',)

    def _is_valid_file(self, path: str, extensions: tuple) -> bool:
        """Check if the file has a valid extension and exists."""
        return path.lower().endswith(extensions) and os.path.isfile(path)

    def _parse_yaml(self, path: str) -> Optional[dict]:
        """Safely parse a YAML file."""
        try:
            with open(path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Error parsing YAML file {path}: {e}")
            return None

    def on_modified(self, event: FileModifiedEvent) -> None:
        """Handle file modification events."""
        if event.is_directory:
            return

        try:
            path = event.src_path
            if self._is_valid_file(path, self.yaml_extensions):
                logger.info(f"Docker Compose file modified: {path}")
                if yaml_content := self._parse_yaml(path):
                    services = yaml_content.get('services', {}).keys()
                    self.notifier.send_notification(
                        "Docker Compose Update",
                        f"File: {os.path.basename(path)}\nServices: {', '.join(services)}"
                    )

            elif self._is_valid_file(path, self.conf_extensions):
                logger.info(f"Proxy configuration modified: {path}")
                self.notifier.send_notification(
                    "Proxy Configuration Update",
                    f"File: {os.path.basename(path)}"
                )

        except Exception as e:
            logger.error(f"Error processing file {event.src_path}: {e}")
            self.notifier.send_notification(
                "Error Processing File",
                f"Error while processing {os.path.basename(event.src_path)}: {str(e)}",
                priority=8
            )

def main():
    """Main function to run the watcher service."""
    compose_dir = os.getenv('COMPOSE_DIR')
    proxy_dir = os.getenv('PROXY_DIR')

    if not all([compose_dir, proxy_dir]):
        raise ConfigurationError("Missing required environment variables: COMPOSE_DIR and/or PROXY_DIR")

    try:
        event_handler = ServiceConfigWatcher(compose_dir, proxy_dir)
        observer = Observer()

        # Watch both directories
        for directory in [compose_dir, proxy_dir]:
            observer.schedule(event_handler, directory, recursive=True)
            logger.info(f"Watching directory: {directory}")

        observer.start()
        NotificationService().send_notification(
            "Watcher Service Started",
            "Monitoring Docker Compose and Proxy configurations"
        )

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Stopping watcher service...")
            observer.stop()
            NotificationService().send_notification(
                "Watcher Service Stopped",
                "Service stopped gracefully"
            )

        observer.join()

    except Exception as e:
        logger.error(f"Fatal error in watcher service: {e}")
        NotificationService().send_notification(
            "Watcher Service Error",
            f"Fatal error: {str(e)}",
            priority=10
        )
        raise

if __name__ == "__main__":
    main()
