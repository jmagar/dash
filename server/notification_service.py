import os
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.gotify_url = os.getenv('GOTIFY_URL')
        self.gotify_token = os.getenv('GOTIFY_TOKEN')
        self.enabled = bool(self.gotify_url and self.gotify_token)
        if self.enabled:
            logger.info("Gotify notifications enabled")
        else:
            logger.info("Gotify notifications disabled")

    def send_notification(self, message: str, title: str = "Docker Services Dashboard", priority: Optional[int] = None) -> bool:
        if not self.enabled:
            return False

        try:
            response = requests.post(
                f"{self.gotify_url}/message",
                json={
                    "message": message,
                    "title": title,
                    "priority": priority or 5
                },
                headers={
                    "X-Gotify-Key": self.gotify_token
                }
            )
            response.raise_for_status()
            logger.info(f"Notification sent: {message}")
            return True
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False
