import logging
import json
import traceback
from datetime import datetime
from typing import Any, Dict

class StructuredLogger(logging.Logger):
    """Custom logger that adds structured logging capabilities."""

    def __init__(self, name: str, level: int = logging.NOTSET):
        super().__init__(name, level)
        self.structured_fields: Dict[str, Any] = {}

    def add_structured_field(self, key: str, value: Any) -> None:
        """Add a field that will be included in all structured log messages."""
        self.structured_fields[key] = value

    def _log_structured(self, level: int, msg: str, *args: Any, **kwargs: Any) -> None:
        """Log a message with structured data."""
        if not self.isEnabledFor(level):
            return

        structured_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': logging.getLevelName(level),
            'logger': self.name,
            'message': msg % args if args else msg,
            **self.structured_fields,
            **kwargs
        }

        if 'exc_info' in kwargs:
            if kwargs['exc_info']:
                structured_data['traceback'] = traceback.format_exc()
            del kwargs['exc_info']

        if 'extra' in kwargs:
            structured_data.update(kwargs['extra'])
            del kwargs['extra']

        self._log(
            level,
            json.dumps(structured_data),
            ()
        )

    def debug_structured(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Log a DEBUG level message with structured data."""
        self._log_structured(logging.DEBUG, msg, *args, **kwargs)

    def info_structured(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Log an INFO level message with structured data."""
        self._log_structured(logging.INFO, msg, *args, **kwargs)

    def warning_structured(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Log a WARNING level message with structured data."""
        self._log_structured(logging.WARNING, msg, *args, **kwargs)

    def error_structured(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Log an ERROR level message with structured data."""
        self._log_structured(logging.ERROR, msg, *args, **kwargs)

    def critical_structured(self, msg: str, *args: Any, **kwargs: Any) -> None:
        """Log a CRITICAL level message with structured data."""
        self._log_structured(logging.CRITICAL, msg, *args, **kwargs)

# Register the custom logger class
logging.setLoggerClass(StructuredLogger)

def setup_base_logger(name: str, level: int = logging.INFO, format_str: str = None) -> StructuredLogger:
    """Set up a new structured logger instance with basic configuration."""
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.handlers:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)

        formatter = logging.Formatter(
            format_str or '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger
