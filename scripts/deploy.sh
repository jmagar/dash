#!/bin/bash

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

# Load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/utils.sh"

# Required environment variables
REQUIRED_ENV_VARS=(
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "JWT_SECRET"
)

# Function to validate environment variables
validate_env_variables() {
    print_step "Validating environment variables..."
    local missing_vars=()
    
    for var in "${REQUIRED_ENV_VARS[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables" "${missing_vars[*]}"
        exit 1
    fi
}

# Load environment variables from .env file
if [ -f "${PROJECT_ROOT}/.env" ]; then
    set -a
    source "${PROJECT_ROOT}/.env"
    set +a
fi

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
        * )
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

# Function to verify configuration
verify_config() {
    print_step "Verifying configuration..."
    save_state "verifying_config"

    # Check if config.yaml exists
    if [ ! -f "${PROJECT_ROOT}/config/config.yaml" ]; then
        print_error "Configuration file not found" "config/config.yaml is missing"
        exit 1
    fi

    # Check required environment variables
    local required_vars=("POSTGRES_PASSWORD" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            print_error "Missing environment variable" "$var is required"
            exit 1
        fi
    done

    print_success "Configuration verified"
}

# Function to create required directories
create_directories() {
    print_step "Creating required directories..."
    save_state "creating_directories"

    # Create app data directories with proper permissions
    mkdir -p "${SHH_DATA_DIR}"/{logs,data,backups}
    mkdir -p "${PROJECT_ROOT}/config"
    chmod -R 755 "${SHH_DATA_DIR}"
    chmod 600 "${PROJECT_ROOT}/config/config.yaml" 2>/dev/null || true

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

# Function to check minimum versions
check_versions() {
    print_step "Checking minimum versions..."
    save_state "checking_versions"
    
    # Check Docker version
    local docker_version=$(docker version --format '{{.Server.Version}}')
    if ! version_gte "${docker_version}" "20.10.0"; then
        print_error "Docker version too old" "Required: 20.10.0+, Found: ${docker_version}"
        exit 1
    fi
    
    # Check Docker Compose version
    local compose_version=$(docker compose version --short)
    if ! version_gte "${compose_version}" "2.0.0"; then
        print_error "Docker Compose version too old" "Required: 2.0.0+, Found: ${compose_version}"
        exit 1
    fi
    
    print_success "Version requirements met"
}

# Function to create backup
backup_data() {
    print_step "Creating backup..."
    save_state "creating_backup"
    
    local backup_dir="${SHH_DATA_DIR}/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    # Create backup directory
    mkdir -p "${backup_dir}"
    
    # Backup PostgreSQL data
    if [ -d "${SHH_DATA_DIR}/data/postgres" ]; then
        tar czf "${backup_dir}/postgres_${timestamp}.tar.gz" -C "${SHH_DATA_DIR}/data" postgres
    fi
    
    # Backup application logs
    if [ -d "${SHH_DATA_DIR}/logs" ]; then
        tar czf "${backup_dir}/logs_${timestamp}.tar.gz" -C "${SHH_DATA_DIR}" logs
    fi
    
    # Backup configuration
    if [ -f "${PROJECT_ROOT}/config/config.yaml" ]; then
        cp "${PROJECT_ROOT}/config/config.yaml" "${backup_dir}/config_${timestamp}.yaml"
    fi
    
    print_success "Backup created in ${backup_dir}"
}

# Function to monitor deployment
monitor_deployment() {
    local duration=${1:-300}  # Default 5 minutes
    print_step "Monitoring deployment for ${duration} seconds..."
    save_state "monitoring_deployment"
    
    local end_time=$(($(date +%s) + duration))
    while [ $(date +%s) -lt ${end_time} ]; do
        # Get container stats
        local stats=$(docker stats --no-stream --format "{{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}")
        
        # Get application metrics
        local metrics
        if curl -s -f "http://localhost:9090/metrics" > /dev/null; then
            metrics=$(curl -s "http://localhost:9090/metrics")
        else
            metrics="Metrics unavailable"
        fi
        
        # Log performance data
        echo "$(date) - Container Stats:
${stats}
Metrics:
${metrics}" >> "${SHH_DATA_DIR}/logs/performance.log"
        
        sleep 10
    done
}

# Function to handle rollback
rollback() {
    local previous_state=$1
    print_step "Rolling back to previous state..."
    save_state "rolling_back"
    
    case ${previous_state} in
        "services_started")
            print_substep "Stopping services..."
            ${DOCKER_COMPOSE} down
            print_substep "Restoring previous services..."
            ${DOCKER_COMPOSE} up -d --no-build
            ;;
        "images_built")
            print_substep "Removing new images..."
            ${DOCKER_COMPOSE} down --rmi local
            print_substep "Restoring from registry..."
            ${DOCKER_COMPOSE} pull
            ;;
    esac
}

# Function to clean up resources
cleanup_resources() {
    print_step "Cleaning up resources..."
    save_state "cleaning_resources"
    
    # Remove old logs if directory exists
    if [ -d "${SHH_DATA_DIR}/logs" ]; then
        find "${SHH_DATA_DIR}/logs" -type f -name "*.log" -mtime +30 -delete 2>/dev/null || true
    fi
    
    # Remove old backups if directory exists
    if [ -d "${SHH_DATA_DIR}/backups" ]; then
        find "${SHH_DATA_DIR}/backups" -type f -mtime +7 -delete 2>/dev/null || true
    fi
    
    # Clean Docker resources with a timeout
    timeout 30s docker system prune -f --filter "until=168h" || true
    
    print_success "Cleanup completed"
}

# Function to check health endpoints
check_health_endpoints() {
    print_step "Testing health endpoints..."
    save_state "testing_health"
    
    local endpoints=(
        "http://localhost:3000/health"
        "http://localhost:3000/api/health"
        "http://localhost:9090/-/healthy"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if ! curl -s -f "${endpoint}" > /dev/null; then
            print_error "Health check failed" "Could not reach ${endpoint}"
            exit 1
        fi
        print_substep "Health check passed for ${endpoint}"
    done
    
    print_success "All health checks passed"
}

# Function to validate environment variables
validate_env_variables() {
    print_step "Validating environment variables..."
    save_state "validating_env"
    
    # Define patterns for validation
    local patterns=(
        "^[a-zA-Z0-9_-]+$:POSTGRES_USER"
        "^[a-zA-Z0-9_-]+$:POSTGRES_DB"
        "^[0-9]+$:PORT"
        "^[a-zA-Z0-9._-]+$:HOST"
    )
    
    for pattern in "${patterns[@]}"; do
        local regex="${pattern%%:*}"
        local var="${pattern#*:}"
        local val="${!var:-}"
        if [ -n "$val" ] && ! [[ "$val" =~ $regex ]]; then
            print_error "Invalid environment variable" "${var} contains invalid characters"
            exit 1
        fi
    done
    
    print_success "Environment variables validated"
}

# Function to rotate logs
rotate_logs() {
    print_step "Rotating logs..."
    save_state "rotating_logs"
    
    local log_dir="${SHH_DATA_DIR}/logs"
    local max_size=$((100 * 1024 * 1024))  # 100MB
    local max_files=5
    
    find "${log_dir}" -type f -name "*.log" -size +${max_size}c | while read -r log_file; do
        # Rotate existing logs
        for i in $(seq $((max_files - 1)) -1 1); do
            if [ -f "${log_file}.$i" ]; then
                mv "${log_file}.$i" "${log_file}.$((i + 1))"
            fi
        done
        
        # Move current log
        mv "${log_file}" "${log_file}.1"
        touch "${log_file}"
    done
    
    print_success "Log rotation completed"
}

# Function to validate dependency graph
validate_dependency_graph() {
    print_step "Validating service dependencies..."
    save_state "validating_dependencies"
    
    # Extract dependencies from compose file
    local deps=$(${DOCKER_COMPOSE} config --format json | jq -r '.services | to_entries[] | select(.value.depends_on) | .key as $service | .value.depends_on[] | "\($service) \(.)"')
    
    # Check for circular dependencies
    if echo "${deps}" | tsort >/dev/null 2>&1; then
        print_success "Dependency graph is valid"
    else
        print_error "Invalid dependencies" "Circular dependency detected"
        exit 1
    fi
}

# Function to check system requirements
check_requirements() {
    print_step "Checking system requirements..."
    
    # Check Docker
    if ! docker info &> /dev/null; then
        print_error "Docker is not running or not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check disk space
    check_disk_space
    
    # Check system resources
    check_deployment_resources
}

# Function to prepare directories
prepare_directories() {
    print_step "Preparing directories..."
    
    # Create data directory if it doesn't exist
    if [ ! -d "${SHH_DATA_DIR}" ]; then
        sudo mkdir -p "${SHH_DATA_DIR}"
        sudo chown -R "${USER}:${USER}" "${SHH_DATA_DIR}"
    fi
    
    # Create required subdirectories
    mkdir -p "${SHH_DATA_DIR}/"{logs,data}
    
    # Set proper permissions
    chmod 755 "${SHH_DATA_DIR}"
    chmod 755 "${SHH_DATA_DIR}/logs"
    chmod 755 "${SHH_DATA_DIR}/data"
}

# Main deployment flow
main() {
    trap 'cleanup_on_error "Received interrupt signal"' INT TERM
    trap 'cleanup_on_error "Error on line $LINENO"' ERR
    
    print_banner "Starting SHH Deployment"
    
    # Validate environment
    validate_env_variables
    check_requirements
    prepare_directories
    
    # Pre-deployment checks
    check_versions
    verify_network
    verify_dependencies
    verify_config
    
    # Create directories first
    create_directories
    
    # Pre-deployment tasks
    rotate_logs
    cleanup_resources
    backup_data
    
    # Deployment steps
    pull_images
    build_images
    start_services
    verify_deployment
    check_health_endpoints
    
    # Post-deployment
    monitor_deployment 300
    display_info
    print_header "Deployment Complete"
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
