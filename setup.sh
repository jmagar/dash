#!/bin/bash

# Setup script for Docker Compose & SWAG Proxy Monitoring Project

# Error handling
set -e
trap 'echo "Error occurred at line $LINENO. Exit code: $?" >&2' ERR

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        log "✓ $1 successful"
    else
        log "✗ $1 failed"
        exit 1
    fi
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log "Please do not run this script as root"
    exit 1
fi

# Check required directories exist
log "Checking required directories..."
if [ ! -d "/mnt/user/compose" ]; then
    log "Error: /mnt/user/compose directory does not exist"
    exit 1
fi

if [ ! -d "/mnt/user/appdata/swag/nginx/proxy-confs" ]; then
    log "Error: /mnt/user/appdata/swag/nginx/proxy-confs directory does not exist"
    exit 1
fi

# Create virtual environment
log "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
check_status "Virtual environment creation"

# Install required Python packages
log "Installing required Python packages..."
pip install --upgrade pip
pip install watchdog \
    flask \
    pyyaml \
    python-dotenv \
    requests \
    typing-extensions
check_status "Package installation"

# Create necessary directories
log "Creating necessary directories..."
mkdir -p templates
mkdir -p logs
check_status "Directory creation"

# Move index.html to templates
log "Moving index.html to templates directory..."
if [ -f "index.html" ]; then
    mv index.html templates/
    check_status "Moving index.html"
else
    log "index.html not found in current directory"
    exit 1
fi

# Create systemd service files with correct paths
log "Setting up systemd service files..."
# Replace placeholder paths in service files
sed -i "s|/path/to|/home/jmagar/dashboard|g" watcher.service
sed -i "s|/path/to|/home/jmagar/dashboard|g" flask.service
sed -i "s|YOUR_USERNAME|jmagar|g" watcher.service
sed -i "s|YOUR_USERNAME|jmagar|g" flask.service

# Copy service files
sudo cp watcher.service /etc/systemd/system/
sudo cp flask.service /etc/systemd/system/
check_status "Service file setup"

# Set correct permissions
log "Setting file permissions..."
chmod +x *.py
chmod 644 /etc/systemd/system/watcher.service
chmod 644 /etc/systemd/system/flask.service
check_status "Permission setup"

# Reload systemd
log "Reloading systemd daemon..."
sudo systemctl daemon-reload
check_status "Systemd reload"

# Enable and start services
log "Enabling and starting services..."
sudo systemctl enable watcher.service
sudo systemctl start watcher.service
check_status "Watcher service startup"

sudo systemctl enable flask.service
sudo systemctl start flask.service
check_status "Flask service startup"

# Verify services are running
log "Verifying services..."
if systemctl is-active --quiet watcher.service && systemctl is-active --quiet flask.service; then
    log "✓ All services are running"
else
    log "✗ Service verification failed. Please check the logs:"
    log "  sudo journalctl -u watcher.service"
    log "  sudo journalctl -u flask.service"
    exit 1
fi

log "Setup completed successfully!"
log "Dashboard should be available at http://localhost:5000"
log "Monitor the services with:"
log "  sudo journalctl -fu watcher.service"
log "  sudo journalctl -fu flask.service"
