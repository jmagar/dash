"""
Docker service package.

This package provides Docker operations with:
- Resource management
- Service operations
- Health monitoring
- Metrics collection
- Event handling
- Connection management
- Validation
"""

from typing import Optional

from ..utils.base_logger import setup_base_logger

# Setup logger
logger = setup_base_logger(__name__)

# Import base models and errors first
from .models import (
    ContainerState,
    HealthState,
    ContainerConfig,
    ServiceConfig,
    NetworkConfig,
    VolumeConfig,
    ContainerStatus,
    Service,
    Network,
    Volume,
    Stack
)

from .interfaces import (
    DockerError,
    ConnectionError,
    ContainerError,
    ServiceError,
    NetworkError,
    VolumeError,
    ValidationError,
    ResourceNotFoundError,
    TimeoutError
)

# Then import services that depend on models and errors
from .validation import ConfigValidator
from .connection import manager as connection_manager
from .service import service as docker_service
from .metrics import collector as metrics_collector
from .health import monitor as health_monitor
from .events import processor as event_processor

__all__ = [
    # Core services
    'connection_manager',
    'event_processor',
    'health_monitor',
    'metrics_collector',
    'docker_service',
    'ConfigValidator',

    # Models
    'ContainerState',
    'HealthState',
    'ContainerConfig',
    'ServiceConfig',
    'NetworkConfig',
    'VolumeConfig',
    'ContainerStatus',
    'Service',
    'Network',
    'Volume',
    'Stack',

    # Errors
    'DockerError',
    'ConnectionError',
    'ContainerError',
    'ServiceError',
    'NetworkError',
    'VolumeError',
    'ValidationError',
    'ResourceNotFoundError',
    'TimeoutError'
]

async def initialize(
    redis_url: str,
    database_url: str,
    docker_url: Optional[str] = None
) -> None:
    """
    Initialize Docker services.

    Args:
        redis_url: Redis connection URL
        database_url: Database connection URL
        docker_url: Optional Docker daemon URL

    Raises:
        DockerError: If initialization fails
    """
    try:
        # Initialize core services
        await connection_manager.initialize(docker_url)
        await event_processor.start()
        await health_monitor.start_monitoring()
        await metrics_collector.start_collection()
        await docker_service.start()

        logger.info("Docker services initialized successfully", extra={
            'redis_url': redis_url,
            'database_url': database_url,
            'docker_url': docker_url
        })
    except Exception as e:
        logger.error("Failed to initialize Docker services", extra={'error': str(e)})
        raise DockerError("Failed to initialize Docker services", cause=e)

async def shutdown() -> None:
    """
    Shutdown Docker services.

    Raises:
        DockerError: If shutdown fails
    """
    try:
        # Shutdown in reverse order
        await docker_service.stop()
        await metrics_collector.stop_collection()
        await health_monitor.stop_monitoring()
        await event_processor.stop()
        await connection_manager.close()

        logger.info("Docker services shut down successfully")
    except Exception as e:
        logger.error("Failed to shutdown Docker services", extra={'error': str(e)})
        raise DockerError("Failed to shutdown Docker services", cause=e)
