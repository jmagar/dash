import logging
import functools
import traceback
import json
from datetime import datetime
from typing import Any, Callable, Dict, Optional, Type, TypeVar, cast
from .config import config

F = TypeVar('F', bound=Callable[..., Any])

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

class LoggerSetup:
    """Handles logger setup and configuration."""

    @staticmethod
    def setup_logger(name: str) -> StructuredLogger:
        """Set up a new structured logger instance."""
        # Register the custom logger class
        logging.setLoggerClass(StructuredLogger)

        # Create logger
        logger = cast(StructuredLogger, logging.getLogger(name))

        # Set level from config
        log_level = getattr(logging, config.logging_config.get('level', 'INFO'))
        logger.setLevel(log_level)

        # Create console handler if not already added
        if not logger.handlers:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(log_level)

            # Create formatter
            formatter = logging.Formatter(
                config.logging_config.get(
                    'format',
                    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                )
            )
            console_handler.setFormatter(formatter)

            # Add handler to logger
            logger.addHandler(console_handler)

        return logger

def with_error_handling(
    logger: Optional[logging.Logger] = None,
    context: str = "",
    raise_error: bool = True
) -> Callable[[F], F]:
    """
    Decorator for error handling and logging.

    Args:
        logger: Logger instance to use. If None, creates a new logger.
        context: Additional context for error messages.
        raise_error: Whether to re-raise caught exceptions.
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            nonlocal logger
            if logger is None:
                logger = LoggerSetup.setup_logger(func.__module__)

            try:
                return func(*args, **kwargs)
            except Exception as e:
                error_msg = f"Error in {func.__name__}"
                if context:
                    error_msg += f" ({context})"
                error_msg += f": {str(e)}"

                if isinstance(logger, StructuredLogger):
                    logger.error_structured(
                        error_msg,
                        function=func.__name__,
                        context=context,
                        error_type=type(e).__name__,
                        error_message=str(e),
                        exc_info=True
                    )
                else:
                    logger.error(error_msg, exc_info=True)

                if raise_error:
                    raise

                return None

        return cast(F, wrapper)

    return decorator
