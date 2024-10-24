# Import gevent and monkey patch before any other imports
from gevent import monkey
monkey.patch_all()

from dotenv import load_dotenv
import os
from flask import Flask, render_template, jsonify, Response, request, send_from_directory
from flask_sockets import Sockets
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import gevent
import threading
from concurrent.futures import ThreadPoolExecutor
import sys

# Create necessary directories
for directory in ['logs', 'static/css', 'static/js/modules', 'templates/components', 'config']:
    Path(directory).mkdir(exist_ok=True, parents=True)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
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

# Initialize WebSocket
sockets = Sockets(app)

# Initialize services
try:
    from server import (
        SSHService,
        NotificationService,
        ProxyService,
        WebSocketService,
        MetricsService
    )

    ssh_service = SSHService()
    notification_service = NotificationService()
    proxy_service = ProxyService()
    websocket_service = WebSocketService(ssh_service=ssh_service)
    metrics_service = MetricsService(ssh_service=ssh_service)

    logger.info("All services initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize services: {e}")
    raise

# Enable CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
    return response

def get_compose_dir() -> str:
    compose_dir = os.getenv('COMPOSE_DIR', '/mnt/user/compose')
    if not os.path.exists(compose_dir):
        logger.error(f"Compose directory does not exist: {compose_dir}")
    return compose_dir

def get_proxy_dir() -> str:
    proxy_dir = os.getenv('PROXY_DIR', '/mnt/user/appdata/swag/nginx/proxy-confs')
    if not os.path.exists(proxy_dir):
        logger.error(f"Proxy directory does not exist: {proxy_dir}")
    return proxy_dir

# Routes with improved error handling
@app.route('/')
def index():
    try:
        servers = ssh_service.load_servers()
        services = []
        for server in servers:
            server_services = ssh_service.get_services(server['name'], get_compose_dir())
            services.extend(server_services)
        return render_template('index.html', services=services, servers=servers)
    except Exception as e:
        logger.error(f"Error in index route: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/servers/add', methods=['POST'])
def add_server():
    try:
        data = request.json
        success = ssh_service.add_server(
            name=data['name'],
            host=data['host'],
            port=data['port'],
            username=data['username'],
            password=data.get('password'),
            key_path=data.get('key_path')
        )
        if success:
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Failed to add server'}), 500
    except Exception as e:
        logger.error(f"Error adding server: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/servers/<server_name>', methods=['DELETE'])
def remove_server(server_name):
    try:
        success = ssh_service.remove_server(server_name)
        if success:
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Failed to remove server'}), 500
    except Exception as e:
        logger.error(f"Error removing server: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/container/<server_name>/<container_id>/status')
def container_status(server_name, container_id):
    try:
        return jsonify(ssh_service.get_container_status(server_name, container_id))
    except Exception as e:
        logger.error(f"Error getting container status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/container/<server_name>/<container_id>/logs')
def container_logs(server_name, container_id):
    try:
        result = ssh_service.execute_command(server_name, f"docker logs --tail 100 {container_id}")
        return jsonify({'logs': result['output']})
    except Exception as e:
        logger.error(f"Error getting container logs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/container/<server_name>/<container_id>/update', methods=['POST'])
def update_container(server_name, container_id):
    try:
        result = ssh_service.execute_command(server_name, f"docker-compose pull && docker-compose up -d {container_id}")
        if result['exit_code'] == 0:
            notification_service.send_notification(f"Container {container_id} updated successfully")
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': result['error']}), 500
    except Exception as e:
        logger.error(f"Error updating container: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/container/<server_name>/<container_id>/metrics')
def container_metrics(server_name, container_id):
    try:
        metrics = metrics_service.get_container_metrics(server_name, container_id)
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting container metrics: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/container/<server_name>/<container_id>/metrics/history')
def container_metrics_history(server_name, container_id):
    try:
        duration = request.args.get('duration', None)
        if duration:
            duration = int(duration)
        metrics = metrics_service.get_metrics_history(container_id, duration)
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting metrics history: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/system/<server_name>/metrics')
def system_metrics(server_name):
    try:
        metrics = metrics_service.get_system_metrics(server_name)
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

# WebSocket routes
@sockets.route('/ws/<path:path>')
def websocket_handler(ws, path):
    websocket_service.handle_connection(ws, path)

if __name__ == '__main__':
    # Start Flask server
    from gevent import pywsgi
    from geventwebsocket.handler import WebSocketHandler
    server = pywsgi.WSGIServer(('0.0.0.0', 5000), app, handler_class=WebSocketHandler)
    server.serve_forever()
