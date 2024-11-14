#!/bin/bash

# Exit on error
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log "Error: Docker is not running"
    exit 1
fi

# Create required directories
log "Creating required directories..."
mkdir -p logs
chmod 755 logs

# Set proper permissions for init.sql
log "Setting proper permissions for database init script..."
chmod 644 db/init.sql

# Build and start services
log "Building and starting services..."
docker compose down --volumes --remove-orphans
docker compose build --no-cache
docker compose up -d

# Wait for services to be healthy
log "Waiting for services to be healthy..."
timeout=300
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose ps | grep -q "healthy"; then
        log "All services are healthy!"
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
    if [ $elapsed -eq $timeout ]; then
        log "Error: Services failed to become healthy within timeout"
        docker compose logs
        exit 1
    fi
done

# Display service status
log "Service status:"
docker compose ps

# Display connection information
log "
Application is running!
Frontend URL: http://localhost:4000
API URL: http://localhost:4000/api
WebSocket URL: ws://localhost:4000

Database connection:
Host: localhost
Port: 5432
User: postgres
Database: shh

Redis connection:
Host: localhost
Port: 6379

To view logs:
docker compose logs -f

To stop services:
docker compose down
"
