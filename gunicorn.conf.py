import os
import multiprocessing

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = 3
worker_class = "geventwebsocket.gunicorn.workers.GeventWebSocketWorker"
worker_connections = 1000
timeout = 120
keepalive = 2

# Process naming
proc_name = "dash-dashboard"
pythonpath = "/app"

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Server mechanics
daemon = False
raw_env = [
    f"PYTHON_PATH={os.getenv('PYTHON_PATH', '/app')}",
    f"FLASK_ENV={os.getenv('FLASK_ENV', 'production')}",
]

# Reload
reload = True
reload_extra_files = [
    'templates/',
    'static/',
    'server/'
]

# Event handlers
def on_starting(server):
    """Called just before the master process is initialized."""
    print("Starting Dash Dashboard server")

def on_reload(server):
    """Called before reloading the workers."""
    print("Reloading workers")

def when_ready(server):
    """Called just after the server is started."""
    print("Server is ready")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    print(f"Pre-fork worker [booting]")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    print(f"Worker {worker.pid} forked")

def pre_exec(server):
    """Called just before a new master process is forked."""
    print("Pre-exec master process")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    print(f"Worker {worker.pid} interrupted")

def worker_abort(worker):
    """Called when a worker received the SIGABRT signal."""
    print(f"Worker {worker.pid} aborted")

def worker_exit(server, worker):
    """Called just after a worker has been exited."""
    print(f"Worker {worker.pid} exited")

def child_exit(server, worker):
    """Called just after a worker has been exited, in the worker process."""
    print(f"Child worker {worker.pid} exited")

# SSL configuration
keyfile = None
certfile = None
ssl_version = 2
cert_reqs = 0

# Debugging
spew = False
check_config = True

# Server mechanics
preload_app = True
sendfile = True

# Logging
capture_output = True
enable_stdio_inheritance = True

# Performance tuning
worker_tmp_dir = "/dev/shm"
max_requests = 1000
max_requests_jitter = 50

def post_worker_init(worker):
    """
    Hook for after a worker is initialized.
    Set up any worker-specific configurations here.
    """
    import resource
    # Increase the soft limit for number of open files
    resource.setrlimit(resource.RLIMIT_NOFILE, (65536, 65536))

    # Set worker process title
    try:
        import setproctitle
        setproctitle.setproctitle(f"{proc_name}: worker [{worker.pid}]")
    except ImportError:
        pass
