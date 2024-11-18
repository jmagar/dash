#!/bin/bash

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

# Load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/utils.sh"

# Environment variables
export SHH_DATA_DIR=${SHH_DATA_DIR:-/var/lib/shh}
export NODE_ENV=${NODE_ENV:-production}

# Docker compose command based on environment
if [ "${NODE_ENV}" = "development" ]; then
    DOCKER_COMPOSE="docker compose -f docker-compose.yml -f docker-compose.dev.yml"
else
    DOCKER_COMPOSE="docker compose"
fi

# Deployment state file for recovery
STATE_FILE="/tmp/shh_deploy_state"

# Function to save deployment state
save_state() {
    echo "$1" > "${STATE_FILE}"
}

# Function to get last deployment state
get_state() {
    if [ -f "${STATE_FILE}" ]; then
        cat "${STATE_FILE}"
    else
        echo "init"
    fi
}

# Function to handle cleanup on error
cleanup_on_error() {
    print_error "Deployment failed" "$1"
    print_warning "Running cleanup..."

    # Check if docker compose is available
    if ! docker compose version &> /dev/null; then
        print_warning "Docker Compose not available, skipping cleanup"
        return 1
    fi

    # Get the current state
    local current_state=$(get_state)

    case ${current_state} in
        "services_started")
            print_substep "Stopping services..."
            ${DOCKER_COMPOSE} down --volumes --remove-orphans || true
            ;;
        "images_built")
            print_substep "Removing built images..."
            ${DOCKER_COMPOSE} down --rmi local --volumes --remove-orphans || true
            ;;
        *)
            print_substep "No cleanup needed"
            ;;
    esac

    # Remove state file
    rm -f "${STATE_FILE}"
}

# Function to check disk space during deployment
check_disk_space() {
    print_step "Checking disk space..."
    
    local required_space=5000000  # 5GB in KB
    local available_space=$(df -k . | awk 'NR==2 {print $4}')
    
    if [ "${available_space}" -lt "${required_space}" ]; then
        print_error "Not enough disk space" "Required: 5GB, Available: $(( available_space / 1024 ))MB"
        exit 1
    fi
}

# Function to check system resources during deployment
check_deployment_resources() {
    print_step "Checking system resources..."

    # Check memory
    local total_memory=$(free -m | awk '/^Mem:/{print $2}')
    local required_memory=4096  # 4GB
    
    if [ "${total_memory}" -lt "${required_memory}" ]; then
        print_error "Not enough memory" "Required: ${required_memory}MB, Available: ${total_memory}MB"
        exit 1
    fi

    # Check CPU cores
    local cpu_cores=$(nproc)
    local required_cores=2
    
    if [ "${cpu_cores}" -lt "${required_cores}" ]; then
        print_error "Not enough CPU cores" "Required: ${required_cores}, Available: ${cpu_cores}"
        exit 1
    fi
}

# Function to verify network connectivity
verify_network() {
    print_step "Verifying network connectivity..."

    # Check Docker Hub connectivity
    if ! curl -s --connect-timeout 5 https://hub.docker.com > /dev/null; then
        print_error "Network connectivity" "Cannot reach Docker Hub"
        exit 1
    fi

    # Check if required ports are available
    for port in 3000 5432 6379 9090; do
        if netstat -tuln | grep -q ":${port} "; then
            print_error "Port conflict" "Port ${port} is already in use"
            exit 1
        fi
    done
}

# Function to verify dependencies
verify_dependencies() {
    print_step "Verifying dependencies..."

    # Check Docker
    if ! docker version &> /dev/null; then
        print_error "Missing dependency" "Docker is not installed or not running"
        exit 1
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        print_error "Missing dependency" "Docker Compose is not installed"
        exit 1
    fi

    # Check Node.js (only needed for development)
    if [ "${NODE_ENV}" = "development" ] && ! node --version &> /dev/null; then
        print_error "Missing dependency" "Node.js is not installed (required for development)"
        exit 1
    fi
}

# Function to create required directories
create_directories() {
    print_step "Creating required directories..."

    # Create app data directories
    sudo mkdir -p "${SHH_DATA_DIR}"/{logs,data}
    sudo chown -R "${USER}:${USER}" "${SHH_DATA_DIR}"
    sudo chmod -R 755 "${SHH_DATA_DIR}"

    print_success "Created required directories in ${SHH_DATA_DIR}"
}

# Enhanced pull images function
pull_images() {
    print_step "Pulling Docker images..."
    save_state "pulling_images"

    ${DOCKER_COMPOSE} pull || {
        print_error "Failed to pull images" "Check network connection and try again"
        exit 1
    }

    print_success "Successfully pulled images"
}

# Enhanced build images function
build_images() {
    print_step "Building images..."
    save_state "building_images"

    ${DOCKER_COMPOSE} build --no-cache || {
        print_error "Failed to build images" "Check build logs for details"
        exit 1
    }

    save_state "images_built"
    print_success "Successfully built images"
}

# Enhanced start services function
start_services() {
    print_step "Starting services..."
    save_state "starting_services"

    ${DOCKER_COMPOSE} up -d || {
        print_error "Failed to start services" "Check logs for details"
        exit 1
    }

    save_state "services_started"
    print_success "Successfully started services"
}

# Enhanced verify deployment function
verify_deployment() {
    print_step "Verifying deployment..."
    local max_attempts=30
    local attempt=1
    local services=("app" "postgres" "redis")

    # Wait for services to be healthy
    while [ ${attempt} -le ${max_attempts} ]; do
        local all_healthy=true
        
        for service in "${services[@]}"; do
            local status=$(${DOCKER_COMPOSE} ps --format json ${service} | jq -r '.[0].Health // "none"')
            
            if [ "${status}" != "healthy" ] && [ "${status}" != "none" ]; then
                all_healthy=false
                break
            fi
            
            local container_id=$(${DOCKER_COMPOSE} ps -q ${service})
            if [ -z "${container_id}" ]; then
                all_healthy=false
                break
            fi
            
            if ! docker inspect "${container_id}" --format '{{.State.Running}}' | grep -q "true"; then
                all_healthy=false
                break
            fi
        done
        
        if ${all_healthy}; then
            print_success "All services are healthy"
            return 0
        fi
        
        print_substep "Waiting for services to be healthy (${attempt}/${max_attempts})..."
        sleep 2
        ((attempt++))
    done
    
    print_error "Deployment verification failed" "Services did not become healthy in time"
    return 1
}

# Enhanced display info function
display_info() {
    print_step "Deployment Information"
    
    # Get container status
    print_substep "Container Status:"
    ${DOCKER_COMPOSE} ps
    
    # Get service URLs
    print_substep "Service URLs:"
    echo "Web UI:          http://localhost:3000"
    echo "API:             http://localhost:3000/api"
    echo "Prometheus:      http://localhost:9090"
    
    # Get resource usage
    print_substep "Resource Usage:"
    ${DOCKER_COMPOSE} top
    
    # Get logs location
    print_substep "Log Locations:"
    echo "Application:     ${SHH_DATA_DIR}/logs/app.log"
    echo "Container Logs:  docker compose logs -f [service]"

    # Display environment
    print_substep "Environment:"
    echo "NODE_ENV:        ${NODE_ENV}"
    echo "Data Directory:  ${SHH_DATA_DIR}"
}

# Main deployment flow
main() {
    print_header "Starting SHH Deployment (${NODE_ENV} mode)"
    
    # Pre-deployment checks
    check_disk_space
    check_deployment_resources
    verify_network
    verify_dependencies
    create_directories
    
    # Deployment steps
    pull_images
    build_images
    start_services
    verify_deployment
    
    # Post-deployment
    display_info
    print_header "Deployment Complete"
}

# Enhanced error handling
trap 'cleanup_on_error "Received interrupt signal"' INT TERM
trap 'cleanup_on_error "Error on line $LINENO"' ERR

# Execute main function
main
