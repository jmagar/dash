#!/bin/bash

# Exit on error
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Stop and remove containers
log "Stopping and removing containers..."
docker compose down --volumes --remove-orphans

# Remove unused Docker resources
log "Cleaning up Docker resources..."
docker system prune -f

# Clean up logs
log "Cleaning up logs..."
rm -rf logs/*

# Display cleanup status
log "Cleanup complete! To restart the application, run: ./scripts/deploy.sh"
