from dotenv import load_dotenv
import os
from flask import Flask, render_template, jsonify, Response, request, send_from_directory
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from server.docker_service import DockerService
from server.notification_service import NotificationService
from server.proxy_service import ProxyService

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

# Initialize Flask app with static file handling
app = Flask(__name__,
    static_url_path='/static',
    static_folder='static'
)

# Initialize services
docker_service = DockerService()
notification_service = NotificationService()
proxy_service = ProxyService()

# Enable CORS for WebSocket connections
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
    return response

def get_compose_dir() -> str:
    return os.getenv('COMPOSE_DIR', '/mnt/user/compose')

def get_proxy_dir() -> str:
    return os.getenv('PROXY_DIR', '/mnt/user/appdata/swag/nginx/proxy-confs')

@app.route('/')
def index():
    services = docker_service.get_services(get_compose_dir())
    return render_template('index.html', services=services)

@app.route('/container/<container_id>/status')
def container_status(container_id):
    return jsonify(docker_service.get_container_status(container_id))

@app.route('/container/<container_id>/logs')
def container_logs(container_id):
    try:
        container = docker_service.client.containers.get(container_id)
        logs = container.logs(tail=100).decode('utf-8')
        return jsonify({'logs': logs})
    except Exception as e:
        logger.error(f"Error getting container logs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/container/<container_id>/update', methods=['POST'])
def update_container(container_id):
    try:
        container = docker_service.client.containers.get(container_id)
        container.restart()
        notification_service.send_notification(f"Container {container.name} updated")
        return jsonify({'status': 'success'})
    except Exception as e:
        logger.error(f"Error updating container: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
