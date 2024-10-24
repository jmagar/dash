#!/bin/bash

# Setup script for Docker Services Dashboard

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

# Create necessary directories
log "Creating necessary directories..."
mkdir -p logs
mkdir -p config
mkdir -p static/css
mkdir -p static/js/modules
mkdir -p templates/components
check_status "Directory creation"

# Set up environment file
log "Setting up environment file..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    log "Created .env file from example. Please edit it with your settings."
else
    log ".env file already exists"
fi

# Set correct permissions
log "Setting file permissions..."
chmod -R 755 .
chmod -R 777 logs
chmod -R 777 config
chmod +x *.py
check_status "Permission setup"

# Create empty config files
log "Creating initial configuration files..."
if [ ! -f "config/servers.json" ]; then
    echo "[]" > config/servers.json
fi
check_status "Configuration file creation"

# Docker setup
if command -v docker &> /dev/null; then
    log "Building and starting Docker containers..."
    docker compose build
    docker compose up -d
    check_status "Docker container setup"
else
    log "Docker not found. Please install Docker and Docker Compose."
    exit 1
fi

# Verify services are running
log "Verifying services..."
if docker compose ps | grep -q "running"; then
    log "✓ All services are running"
else
    log "✗ Service verification failed. Please check the logs:"
    log "  docker compose logs"
    exit 1
fi

log "Setup completed successfully!"
log "Dashboard should be available at http://localhost:5932"
log "Monitor the services with:"
log "  docker compose logs -f"
log ""
log "Next steps:"
log "1. Edit .env file with your settings"
log "2. Add your servers through the dashboard interface"
log "3. Configure your notification settings if desired"
