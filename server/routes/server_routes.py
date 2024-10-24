from flask import Blueprint, jsonify, request, current_app
from typing import Dict, Any, Tuple
from ..utils.logger import LoggerSetup, with_error_handling
from ..utils.config import config

logger = LoggerSetup.setup_logger(__name__)
bp = Blueprint('servers', __name__, url_prefix='/servers')

@bp.route('/suggested', methods=['GET'])
@with_error_handling(logger=logger, context="get_suggested_servers")
def get_suggested_servers() -> Tuple[Dict[str, Any], int]:
    """Get list of suggested servers with their services."""
    servers = current_app.ssh_service.get_suggested_servers()
    compose_dir = current_app.config.get('COMPOSE_DIR', '/mnt/user/compose')

    # Get services for each server
    for server in servers:
        if server['type'] == 'ssh':
            services = current_app.ssh_service.get_services(server['name'], compose_dir)
        elif server['type'] == 'docker_socket':
            services = current_app.docker_service.get_socket_services(server['socket_path'])
        elif server['type'] == 'docker_remote':
            services = current_app.docker_service.get_remote_services(
                server['docker_host'],
                use_tls=server.get('use_tls', False),
                cert_path=server.get('cert_path'),
                key_path=server.get('key_path'),
                ca_path=server.get('ca_path')
            )
        server['services'] = services

    return jsonify({
        "data": {
            "servers": servers
        },
        "message": "Success",
        "status": "success"
    }), 200

@bp.route('/save', methods=['POST', 'PUT'])
@with_error_handling(logger=logger, context="save_server")
def save_server() -> Tuple[Dict[str, Any], int]:
    """Save server connection details."""
    data = request.get_json()

    # Validate required fields
    if 'name' not in data or 'type' not in data:
        return jsonify({
            "status": "error",
            "message": "Name and type are required"
        }), 400

    # Validate type-specific fields
    if data['type'] == 'ssh':
        # Required fields for SSH
        required_fields = ['host', 'port', 'username']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                "status": "error",
                "message": f"Missing required SSH fields: {', '.join(missing_fields)}"
            }), 400

        # Check authentication method
        auth_type = data.get('auth_type')
        if auth_type == 'password':
            if not data.get('password'):
                return jsonify({
                    "status": "error",
                    "message": "Password is required for password authentication"
                }), 400
        elif auth_type == 'key':
            if not data.get('ssh_key'):
                return jsonify({
                    "status": "error",
                    "message": "SSH key is required for key authentication"
                }), 400
        else:
            return jsonify({
                "status": "error",
                "message": "Invalid authentication type for SSH connection"
            }), 400

    elif data['type'] == 'docker_socket':
        if 'socket_path' not in data:
            data['socket_path'] = '/var/run/docker.sock'  # Use default socket path

    elif data['type'] == 'docker_remote':
        if 'docker_host' not in data:
            return jsonify({
                "status": "error",
                "message": "Docker host is required for remote connections"
            }), 400

        if data.get('use_tls'):
            tls_fields = ['cert_path', 'key_path', 'ca_path']
            missing_fields = [field for field in tls_fields if field not in data]
            if missing_fields:
                return jsonify({
                    "status": "error",
                    "message": f"Missing required TLS fields: {', '.join(missing_fields)}"
                }), 400

    else:
        return jsonify({
            "status": "error",
            "message": f"Invalid connection type: {data['type']}"
        }), 400

    try:
        # Add or update server in config
        if request.method == 'POST':
            config.add_server(data)
        else:
            # For PUT, first remove existing server then add new one
            config.remove_server(data['name'])
            config.add_server(data)

        return jsonify({
            "status": "success",
            "message": "Connection saved successfully"
        }), 200

    except Exception as e:
        logger.error(f"Error saving connection: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@bp.route('/<server_name>', methods=['DELETE'])
@with_error_handling(logger=logger, context="remove_server")
def remove_server(server_name: str) -> Tuple[Dict[str, Any], int]:
    """Remove a server configuration."""
    try:
        config.remove_server(server_name)
        return jsonify({
            "status": "success",
            "message": "Connection removed successfully"
        }), 200
    except Exception as e:
        logger.error(f"Error removing connection: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@bp.route('/<server_name>/services', methods=['GET'])
@with_error_handling(logger=logger, context="get_server_services")
def get_server_services(server_name: str) -> Tuple[Dict[str, Any], int]:
    """Get services for a specific server."""
    server = config.get_server(server_name)
    if not server:
        return jsonify({
            "status": "error",
            "message": f"Connection {server_name} not found"
        }), 404

    try:
        if server['type'] == 'ssh':
            compose_dir = current_app.config.get('COMPOSE_DIR', '/mnt/user/compose')
            services = current_app.ssh_service.get_services(server_name, compose_dir)
        elif server['type'] == 'docker_socket':
            services = current_app.docker_service.get_socket_services(server['socket_path'])
        elif server['type'] == 'docker_remote':
            services = current_app.docker_service.get_remote_services(
                server['docker_host'],
                use_tls=server.get('use_tls', False),
                cert_path=server.get('cert_path'),
                key_path=server.get('key_path'),
                ca_path=server.get('ca_path')
            )
        else:
            return jsonify({
                "status": "error",
                "message": f"Invalid connection type: {server['type']}"
            }), 400

        return jsonify({
            "data": {
                "services": services
            },
            "message": "Success",
            "status": "success"
        }), 200

    except Exception as e:
        logger.error(f"Error getting services: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
