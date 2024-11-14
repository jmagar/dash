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

# Start only the required services for development
log "Starting development services..."
docker compose up -d db redis

# Wait for services to be healthy
log "Waiting for services to be healthy..."
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose ps | grep "db" | grep -q "healthy" && \
       docker compose ps | grep "redis" | grep -q "healthy"; then
        log "All development services are healthy!"
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
    if [ $elapsed -eq $timeout ]; then
        log "Error: Services failed to become healthy within timeout"
        docker compose logs db redis
        exit 1
    fi
done

# Start development servers
log "Starting development servers..."
if [ -n "$1" ] && [ "$1" = "--frontend-only" ]; then
    npm run dev:client
elif [ -n "$1" ] && [ "$1" = "--backend-only" ]; then
    npm run dev:server
else
    npm run dev
fi
