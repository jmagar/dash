import os
import logging
from app import create_app
from server.utils.config import config
from server.utils.logger import LoggerSetup

# Initialize logging
logger = LoggerSetup.setup_logger(__name__)

try:
    # Load configuration
    config.setup_logging()
    logger.info("Configuration loaded successfully")

    # Create Flask application
    app = create_app()
    logger.info("Application imported successfully")

except Exception as e:
    logger.error(f"Failed to initialize application: {e}")
    raise

def on_starting(server):
    """Called just before the master process is initialized."""
    logger.info("Starting Dash Dashboard server")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    logger.info(f"Worker process initialized with pid: {worker.pid}")

def on_exit(server):
    """Called just before exiting Gunicorn."""
    logger.info("Shutting down Dash Dashboard server")
