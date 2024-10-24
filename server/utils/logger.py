import functools
from typing import Any, Callable, Optional, TypeVar, cast
import logging
from .base import StructuredLogger, setup_base_logger

F = TypeVar('F', bound=Callable[..., Any])

class LoggerSetup:
    """Handles logger setup and configuration."""

    @staticmethod
    def setup_logger(name: str) -> StructuredLogger:
        """Set up a new structured logger instance."""
        return cast(StructuredLogger, setup_base_logger(name))

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
