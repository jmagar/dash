import multiprocessing
import os
from gevent import monkey
monkey.patch_all()

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = 3
worker_class = "geventwebsocket.gunicorn.workers.GeventWebSocketWorker"
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "debug"
capture_output = True
enable_stdio_inheritance = True

# Process naming
proc_name = "dash-dashboard"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL
keyfile = None
certfile = None

# Debugging
reload = True
reload_extra_files = [
    "templates/",
    "static/",
    "server/"
]

# Server hooks
def on_starting(server):
    server.log.info("Starting Dash Dashboard server")

def on_exit(server):
    server.log.info("Shutting down Dash Dashboard server")

def worker_abort(worker):
    worker.log.info(f"Worker {worker.pid} was terminated")

# Create WSGI application with WebSocket support
def post_fork(server, worker):
    from geventwebsocket.handler import WebSocketHandler
    worker.socket_handler = WebSocketHandler
