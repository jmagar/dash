#!/bin/bash

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

# Load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/utils.sh"

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
            print_substep "Basic cleanup..."
            ${DOCKER_COMPOSE} down --volumes --remove-orphans || true
            ;;
    esac

    # Clean up state file
    rm -f "${STATE_FILE}"

    # Print debug information
    if [ "${VERBOSE:-}" = "true" ]; then
        print_substep "Debug Information:"
        docker system info
        docker compose ps -a
        docker compose logs
    fi

    exit 1
}

# Function to check disk space during deployment
check_disk_space() {
    local min_space=$((10 * 1024 * 1024)) # 10GB in KB
    local available_space=$(df -k . | awk 'NR==2 {print $4}')

    if [ "${available_space}" -lt "${min_space}" ]; then
        cleanup_on_error "Insufficient disk space. At least 10GB required."
    fi
}

# Function to check system resources during deployment
check_deployment_resources() {
    print_step "Checking deployment resources"

    # Check disk space
    print_substep "Checking disk space..."
    check_disk_space

    # Check memory
    print_substep "Checking memory..."
    if command -v free &> /dev/null; then
        local available_mem=$(free -m | awk 'NR==2 {print $7}')
        if [ "${available_mem}" -lt 2048 ]; then # 2GB minimum
            cleanup_on_error "Insufficient memory. At least 2GB required."
        fi
    fi

    # Check Docker resource limits
    print_substep "Checking Docker limits..."
    local max_containers=$(docker info --format '{{.Containers}}')
    if [ "${max_containers}" -gt 950 ]; then # Docker default is 1000
        cleanup_on_error "Too many Docker containers. Please clean up."
    fi
}

# Function to verify network connectivity
verify_network() {
    print_step "Verifying network connectivity"

    # Check Docker Hub connectivity
    print_substep "Checking Docker Hub access..."
    if ! curl -s --connect-timeout 5 https://hub.docker.com > /dev/null; then
        cleanup_on_error "Cannot connect to Docker Hub. Check your internet connection."
    fi

    # Check required ports
    print_substep "Checking port availability..."
    local required_ports=(4000 5432 6379 9090)
    for port in "${required_ports[@]}"; do
        if lsof -i ":${port}" &> /dev/null; then
            cleanup_on_error "Port ${port} is already in use"
        fi
    done
}

# Function to verify dependencies
verify_dependencies() {
    print_step "Verifying dependencies"

    # Check Docker and Docker Compose first
    if ! command -v docker &> /dev/null; then
        cleanup_on_error "Required command not found: docker"
    fi

    if ! docker compose version &> /dev/null; then
        cleanup_on_error "Required command not found: docker compose. Please install Docker Compose V2"
    fi

    # Check other required commands
    local required_commands=(
        "curl" "jq" "awk" "sed" "openssl" "grep" "lsof" "df" "mkdir" "chmod"
    )

    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" &> /dev/null; then
            cleanup_on_error "Required command not found: ${cmd}"
        fi
    done
}

# Enhanced pull images function
pull_images() {
    if [ "${SKIP_PULL:-}" = "true" ]; then
        print_warning "Skipping image pull (--skip-pull)"
        return 0
    fi

    print_step "Pulling Docker images"

    # Get list of required images
    local images=$(${DOCKER_COMPOSE} config | grep 'image:' | awk '{print $2}' | sort -u)

    # Pull each image with retry logic
    for image in ${images}; do
        local retries=3
        while [ ${retries} -gt 0 ]; do
            if docker pull "${image}"; then
                break
            fi
            retries=$((retries - 1))
            if [ ${retries} -eq 0 ]; then
                cleanup_on_error "Failed to pull image: ${image}"
            fi
            print_warning "Retrying pull for ${image}... (${retries} attempts left)"
            sleep 5
        done
    done

    save_state "images_pulled"
}

# Enhanced build images function
build_images() {
    print_step "Building Docker images"

    local build_args=""
    if [ -n "${NO_CACHE:-}" ]; then
        print_substep "Building without cache..."
        build_args="${build_args} --no-cache"
    fi

    if [ "${VERBOSE:-}" = "true" ]; then
        print_substep "Building with verbose output..."
        build_args="${build_args} --progress=plain"
    fi

    # Build with retry logic
    local retries=3
    while [ ${retries} -gt 0 ]; do
        if ${DOCKER_COMPOSE} build ${build_args}; then
            break
        fi
        retries=$((retries - 1))
        if [ ${retries} -eq 0 ]; then
            cleanup_on_error "Failed to build Docker images"
        fi
        print_warning "Retrying build... (${retries} attempts left)"
        sleep 5
    done

    save_state "images_built"
}

# Enhanced start services function
start_services() {
    print_step "Starting services"

    local up_args="--detach --remove-orphans"
    if [ -n "${FORCE_RECREATE:-}" ]; then
        print_substep "Force recreating containers..."
        up_args="${up_args} --force-recreate"
    fi

    # Start with retry logic
    local retries=3
    while [ ${retries} -gt 0 ]; do
        if ${DOCKER_COMPOSE} up ${up_args}; then
            break
        fi
        retries=$((retries - 1))
        if [ ${retries} -eq 0 ]; then
            cleanup_on_error "Failed to start services"
        fi
        print_warning "Retrying service start... (${retries} attempts left)"
        sleep 5
    done

    save_state "services_started"
}

# Enhanced verify deployment function
verify_deployment() {
    print_step "Verifying deployment"

    # Check container status with timeout
    print_substep "Checking container status..."
    local timeout=30
    local interval=2
    local elapsed=0

    while [ ${elapsed} -lt ${timeout} ]; do
        local failed_containers=$(${DOCKER_COMPOSE} ps --format json | jq -r '.[] | select(.State != "running") | .Name')
        if [ -z "${failed_containers}" ]; then
            break
        fi
        elapsed=$((elapsed + interval))
        if [ ${elapsed} -eq ${timeout} ]; then
            cleanup_on_error "Some containers failed to start: ${failed_containers}"
        fi
        sleep ${interval}
    done

    # Check service health with improved error reporting
    if ! check_health 300; then
        local unhealthy_services=$(${DOCKER_COMPOSE} ps --format json | jq -r '.[] | select(.Health != "healthy") | "\(.Name) (\(.Health))"')
        cleanup_on_error "Health check failed for services: ${unhealthy_services}"
    fi

    # Verify API endpoint with detailed error reporting
    print_substep "Verifying API endpoint..."
    local max_retries=30
    local retry_count=0
    local api_url="http://localhost:4000/api/health"
    local last_error=""

    while [ ${retry_count} -lt ${max_retries} ]; do
        local response=$(curl -s -w "\n%{http_code}" "${api_url}" 2>&1)
        local status_code=$(echo "${response}" | tail -n1)
        local body=$(echo "${response}" | head -n-1)

        if [ "${status_code}" = "200" ]; then
            break
        fi

        last_error="Status: ${status_code}, Response: ${body}"
        retry_count=$((retry_count + 1))
        sleep 2
    done

    if [ ${retry_count} -eq ${max_retries} ]; then
        cleanup_on_error "API endpoint verification failed: ${last_error}"
    fi

    # Verify database connection
    print_substep "Verifying database connection..."
    if ! ${DOCKER_COMPOSE} exec -T db pg_isready -U postgres -d shh; then
        cleanup_on_error "Database is not ready"
    fi

    # Verify Redis connection
    print_substep "Verifying Redis connection..."
    if ! ${DOCKER_COMPOSE} exec -T redis redis-cli ping | grep -q "PONG"; then
        cleanup_on_error "Redis is not responding"
    fi

    save_state "verified"
}

# Enhanced display info function
display_info() {
    print_step "Deployment Information"

    # Get container status
    print_substep "Container Status:"
    docker compose ps

    # Get resource usage
    print_substep "Resource Usage:"
    docker compose top

    # Get container health
    print_substep "Container Health:"
    docker compose ps --format json | jq -r '.[] | "\(.Name): \(.Health)"'

    # Get exposed ports
    print_substep "Exposed Ports:"
    docker compose ps --format json | jq -r '.[] | select(.Publishers != null) | "\(.Name): \(.Publishers)"'

    print_status "
🎉 SSH Host Hub has been successfully deployed!

📱 Access Points:
   Frontend: http://localhost:4000
   API: http://localhost:4000/api
   WebSocket: ws://localhost:4000
   Prometheus: http://localhost:9090

🔍 Monitoring:
   - View logs: ${YELLOW}docker compose logs -f${NC}
   - Check status: ${YELLOW}docker compose ps${NC}
   - Monitor resources: ${YELLOW}docker compose top${NC}

🛠️ Management:
   - Stop: ${YELLOW}docker compose down${NC}
   - Restart: ${YELLOW}docker compose restart${NC}
   - Rebuild: ${YELLOW}./scripts/deploy.sh --no-cache${NC}

💡 For more information, visit:
   https://github.com/yourusername/shh/wiki

⚠️ If you encounter any issues:
   1. Check the logs: ${YELLOW}docker compose logs${NC}
   2. Verify services: ${YELLOW}docker compose ps${NC}
   3. Visit our troubleshooting guide: https://github.com/yourusername/shh/wiki/troubleshooting
"

    save_state "completed"
}

# Main deployment flow
main() {
    # Clean up any existing state
    rm -f "${STATE_FILE}"

    # Print banner
    print_banner

    # Initial checks
    verify_dependencies
    check_system_requirements || exit 1
    check_deployment_resources
    verify_network

    # Initial setup
    create_directories
    setup_env || exit 1
    setup_permissions

    # Deployment steps
    pull_images
    build_images
    start_services
    verify_deployment
    display_info

    print_status "Deployment completed successfully! 🎉"
}

# Enhanced error handling
trap 'cleanup_on_error "Received interrupt signal"' INT TERM
trap 'cleanup_on_error "Error on line $LINENO"' ERR

# Run deployment
main
