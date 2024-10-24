from dotenv import load_dotenv
import os
from flask import Flask, render_template, jsonify, Response, request, send_from_directory
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import asyncio
import websockets
import threading
from concurrent.futures import ThreadPoolExecutor
from server.docker_service import DockerService
from server.notification_service import NotificationService
from server.proxy_service import ProxyService
from server.websocket_service import WebSocketService
from server.metrics_service import MetricsService

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

# Load environment variables
try:
    load_dotenv()
    logger.info("Environment variables loaded successfully")
except Exception as e:
    logger.error(f"Failed to load .env file: {e}")
    raise

# Initialize Flask app
app = Flask(__name__,
    static_url_path='/static',
    static_folder='static'
)

# Initialize services
docker_service = DockerService()
notification_service = NotificationService()
proxy_service = ProxyService()
websocket_service = WebSocketService()
metrics_service = MetricsService()

# Enable CORS
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

# Routes
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
        logs = docker_service.get_container_logs(container_id)
        return jsonify({'logs': logs})
    except Exception as e:
        logger.error(f"Error getting container logs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/container/<container_id>/update', methods=['POST'])
def update_container(container_id):
    try:
        success = docker_service.update_container(container_id)
        if success:
            notification_service.send_notification(f"Container {container_id} updated successfully")
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Update failed'}), 500
    except Exception as e:
        logger.error(f"Error updating container: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/container/<container_id>/metrics')
def container_metrics(container_id):
    try:
        metrics = metrics_service.get_container_metrics(container_id)
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting container metrics: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/container/<container_id>/metrics/history')
def container_metrics_history(container_id):
    try:
        duration = request.args.get('duration', None)
        if duration:
            duration = int(duration)
        metrics = metrics_service.get_metrics_history(container_id, duration)
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting metrics history: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/system/metrics')
def system_metrics():
    try:
        metrics = metrics_service.get_system_metrics()
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/proxy/configs')
def proxy_configs():
    try:
        configs = proxy_service.get_proxy_configs()
        return jsonify(configs)
    except Exception as e:
        logger.error(f"Error getting proxy configs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/proxy/<config_name>/enable', methods=['POST'])
def enable_proxy(config_name):
    try:
        success = proxy_service.enable_proxy(config_name)
        if success:
            notification_service.send_notification(f"Proxy config {config_name} enabled")
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Enable failed'}), 500
    except Exception as e:
        logger.error(f"Error enabling proxy config: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/proxy/<config_name>/disable', methods=['POST'])
def disable_proxy(config_name):
    try:
        success = proxy_service.disable_proxy(config_name)
        if success:
            notification_service.send_notification(f"Proxy config {config_name} disabled")
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Disable failed'}), 500
    except Exception as e:
        logger.error(f"Error disabling proxy config: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

# WebSocket server
async def websocket_server():
    async with websockets.serve(
        websocket_service.handle_connection,
        "0.0.0.0",
        5001,
        ping_interval=30,
        ping_timeout=10
    ):
        await asyncio.Future()  # run forever

def run_websocket_server():
    asyncio.run(websocket_server())

if __name__ == '__main__':
    # Start WebSocket server in a separate thread
    websocket_thread = threading.Thread(target=run_websocket_server)
    websocket_thread.daemon = True
    websocket_thread.start()

    # Start Flask server
    app.run(host='0.0.0.0', port=5000)
