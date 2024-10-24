import os
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask

# Create necessary directories
Path('logs').mkdir(exist_ok=True)
Path('static/css').mkdir(exist_ok=True, parents=True)
Path('static/js/modules').mkdir(exist_ok=True, parents=True)
Path('templates/components').mkdir(exist_ok=True, parents=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add file handler for logging
file_handler = RotatingFileHandler(
    'logs/dashboard.log',
    maxBytes=1024 * 1024,  # 1MB
    backupCount=5
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger.addHandler(file_handler)

# Load environment variables from .env file
try:
    load_dotenv()
    logger.info("Environment variables loaded successfully")
except Exception as e:
    logger.error(f"Failed to load .env file: {e}")
    raise

def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__,
        static_url_path='/static',
        static_folder='static',
        template_folder='templates'
    )

    # Enable CORS for WebSocket connections
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

    # Add security headers
    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com "
            "https://cdn.tailwindcss.com https://cdn.jsdelivr.net; "
            "img-src 'self' data: https://fonts.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com "
            "https://cdn.tailwindcss.com; "
            "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net;"
        )
        return response

    return app

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
