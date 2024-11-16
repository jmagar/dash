#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
    if [ -n "${2:-}" ]; then
        echo -e "${RED}Details:${NC} $2"
    fi
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}Step: ${CYAN}$1${NC}"
}

print_substep() {
    echo -e "${MAGENTA}  >${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    print_substep "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed" "Visit https://docs.docker.com/get-docker/ for installation instructions"
        return 1
    fi

    print_substep "Checking Docker daemon..."
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running" "Please start the Docker service"
        return 1
    fi

    print_substep "Checking Docker version..."
    local version=$(docker version --format '{{.Server.Version}}' 2>/dev/null)
    if [[ "${version}" < "20.10.0" ]]; then
        print_warning "Docker version ${version} is older than recommended (20.10.0+)"
    else
        print_substep "Docker ${version} "
    fi

    return 0
}

# Check if Docker Compose is installed
check_docker_compose() {
    print_substep "Checking Docker Compose installation..."
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed" "Visit https://docs.docker.com/compose/install/ for installation instructions"
        return 1
    fi

    local version=$(docker compose version --short)
    print_substep "Docker Compose ${version} "
    return 0
}

# Check system resources
check_system_resources() {
    print_substep "Checking system resources..."
    
    # Check available disk space
    local available_space=$(df -k . | awk 'NR==2 {print $4}')
    local min_space=$((10 * 1024 * 1024)) # 10GB in KB
    if [ "${available_space}" -lt "${min_space}" ]; then
        print_warning "Low disk space: Less than 10GB available"
    fi

    # Check available memory
    if command -v free &> /dev/null; then
        local available_mem=$(free -m | awk 'NR==2 {print $7}')
        local min_mem=2048 # 2GB in MB
        if [ "${available_mem}" -lt "${min_mem}" ]; then
            print_warning "Low memory: Less than 2GB available"
        fi
    fi

    # Check CPU cores
    local cpu_cores=$(nproc)
    if [ "${cpu_cores}" -lt 2 ]; then
        print_warning "Limited CPU: Only ${cpu_cores} core(s) available"
    fi
}

# Check system requirements
check_system_requirements() {
    print_step "Checking system requirements"
    
    local failed=0
    check_docker || failed=1
    check_docker_compose || failed=1
    check_system_resources

    if [ "${failed}" -eq 1 ]; then
        print_error "System requirements check failed"
        return 1
    fi

    print_status "System requirements check passed "
    return 0
}

# Create and set up directories
create_directories() {
    print_step "Setting up directories"

    local dirs=(
        "logs"
        "logs/app"
        "logs/nginx"
        "logs/postgres"
        "data/postgres"
        "data/redis"
        "data/prometheus"
        "data/uploads"
    )

    for dir in "${dirs[@]}"; do
        print_substep "Creating ${dir}..."
        mkdir -p "${dir}"
        chmod 777 "${dir}"
    done

    print_status "Directory setup complete "
}

# Setup environment file
setup_env() {
    print_step "Setting up environment"

    if [ ! -f .env ]; then
        if [ ! -f .env.example ]; then
            print_error "No .env.example file found"
            return 1
        fi

        print_substep "Creating .env from .env.example..."
        cp .env.example .env
        
        # Generate random JWT secret if not set
        if ! grep -q "JWT_SECRET=" .env || grep -q "JWT_SECRET=your-secret-key" .env; then
            print_substep "Generating secure JWT secret..."
            local jwt_secret=$(openssl rand -hex 32)
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=${jwt_secret}/" .env
        fi

        print_warning "Please update the .env file with your configuration"
    else
        print_substep "Using existing .env file"
        
        # Validate required environment variables
        local required_vars=(
            "NODE_ENV"
            "PORT"
            "DB_HOST"
            "DB_PORT"
            "DB_USER"
            "DB_PASSWORD"
            "DB_NAME"
            "JWT_SECRET"
        )

        local missing_vars=()
        for var in "${required_vars[@]}"; do
            if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env; then
                missing_vars+=("${var}")
            fi
        done

        if [ ${#missing_vars[@]} -ne 0 ]; then
            print_error "Missing required environment variables" "${missing_vars[*]}"
            return 1
        fi
    fi

    print_status "Environment setup complete "
}

# Set permissions
setup_permissions() {
    print_step "Setting up permissions"

    # Database initialization script
    if [ -f db/init.sql ]; then
        print_substep "Setting database init script permissions..."
        chmod 644 db/init.sql
    fi

    # Ensure node_modules is writable
    if [ -d node_modules ]; then
        print_substep "Setting node_modules permissions..."
        chmod -R 777 node_modules
    fi

    print_status "Permissions setup complete "
}

# Check service health
check_health() {
    local timeout=${1:-300}
    local service=${2:-}
    local wait_time=5
    local elapsed=0
    local start_time=$(date +%s)

    print_step "Checking service health"
    print_substep "Timeout: ${timeout}s"
    if [ -n "${service}" ]; then
        print_substep "Monitoring service: ${service}"
    fi

    while [ $elapsed -lt $timeout ]; do
        if [ -n "${service}" ]; then
            if docker compose ps "${service}" | grep -q "healthy"; then
                local end_time=$(date +%s)
                local duration=$((end_time - start_time))
                print_status "Service ${service} is healthy (took ${duration}s) "
                return 0
            fi
        else
            if docker compose ps | grep -q "healthy"; then
                local end_time=$(date +%s)
                local duration=$((end_time - start_time))
                print_status "All services are healthy (took ${duration}s) "
                return 0
            fi
        fi

        local remaining=$((timeout - elapsed))
        print_substep "Waiting for services... ${remaining}s remaining"
        sleep $wait_time
        elapsed=$((elapsed + wait_time))
    done

    print_error "Health check failed" "Services did not become healthy within ${timeout}s"
    docker compose logs
    return 1
}

# Parse command line arguments
parse_args() {
    NO_CACHE=""
    FORCE_RECREATE=""
    SKIP_PULL=""
    VERBOSE=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-cache)
                NO_CACHE="--no-cache"
                shift
                ;;
            --force-recreate)
                FORCE_RECREATE="--force-recreate"
                shift
                ;;
            --skip-pull)
                SKIP_PULL="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    export NO_CACHE FORCE_RECREATE SKIP_PULL VERBOSE
}

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "  ____  ____  _   _ "
    echo " / ___|| ___|| | | |"
    echo " \___ \|___ \| |_| |"
    echo "  ___) |___) |  _  |"
    echo " |____/|____/|_| |_|"
    echo -e "${NC}"
    echo -e "${BLUE}SSH Host Hub - Deployment Script${NC}\n"
}
