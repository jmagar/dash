# Import gevent and monkey patch before any other imports
from gevent import monkey
monkey.patch_all()

import logging
logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Import app after monkey patching
try:
    from app import app
    logger.info("Application imported successfully")
except Exception as e:
    logger.error(f"Failed to import app: {e}")
    raise

# Create WSGI application with WebSocket support
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler

def create_app():
    server = pywsgi.WSGIServer(('0.0.0.0', 5000), app, handler_class=WebSocketHandler)
    return server

if __name__ == '__main__':
    server = create_app()
    server.serve_forever()
