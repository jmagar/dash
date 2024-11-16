#!/bin/bash
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Print colored output
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  error "Please run as root"
  exit 1
fi

# Check for required commands
check_command() {
  if ! command -v "$1" &> /dev/null; then
    error "$1 is required but not installed"
    exit 1
  fi
}

check_command docker
check_command docker-compose

# Create required directories
info "Creating directories..."
mkdir -p config data logs
chmod 755 config data logs

# Check if Docker is running
if ! docker info &> /dev/null; then
  error "Docker is not running"
  exit 1
fi

# Create Docker network if it doesn't exist
if ! docker network inspect shh-network &> /dev/null; then
  info "Creating Docker network..."
  docker network create shh-network
fi

# Generate default config if it doesn't exist
if [ ! -f config/agent.json ]; then
  info "Generating default configuration..."
  cat > config/agent.json << 'EOL'
{
  "server": {
    "url": "wss://localhost:4000/agent",
    "heartbeat_interval": "30s",
    "reconnect_delay": "5s"
  },
  "logging": {
    "level": "info",
    "format": "json",
    "file": "/var/log/shh-agent/agent.log",
    "max_size": 10,
    "max_files": 5,
    "compress": true
  },
  "monitoring": {
    "enabled": true,
    "interval": "1m",
    "retention": "7d"
  },
  "security": {
    "tls_verify": true,
    "min_tls_version": "1.2"
  },
  "process": {
    "max_jobs": 10,
    "job_timeout": "1h"
  }
}
EOL
fi

# Set proper permissions
info "Setting permissions..."
chmod 600 config/agent.json
chown -R 1000:1000 config data logs  # 1000 is the UID/GID of the shh user in the container

# Build and start the container
info "Building and starting agent..."
docker-compose up -d --build

# Check if container is running
if docker-compose ps | grep -q "shh-agent.*Up"; then
  info "Agent is running successfully"
else
  error "Agent failed to start"
  docker-compose logs
  exit 1
fi

# Print status and next steps
info "Setup completed successfully!"
echo -e "\nNext steps:"
echo "1. Configure server URL in config/agent.json"
echo "2. Check logs in logs/agent.log"
echo "3. Monitor agent status with: docker-compose ps"
echo -e "\nUseful commands:"
echo "- View logs: docker-compose logs -f"
echo "- Restart agent: docker-compose restart"
echo "- Stop agent: docker-compose down"
