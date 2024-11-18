#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Initialize Docker Compose command
DOCKER_COMPOSE="docker compose"

# Function to print status messages
print_status() {
    echo -e "${GREEN}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}Success:${NC} $1"
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

print_header() {
    echo -e "\n${CYAN}=== $1 ===${NC}\n"
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
}

# Check if Docker Compose is installed
check_docker_compose() {
    print_substep "Checking Docker Compose installation..."
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose V2 is not installed" "Visit https://docs.docker.com/compose/install/ for installation instructions"
        return 1
    fi
}

# Check system resources
check_system_resources() {
    print_substep "Checking system memory..."
    local total_memory=$(free -m | awk '/^Mem:/{print $2}')
    if [ "${total_memory}" -lt 4096 ]; then
        print_warning "Low memory detected (${total_memory}MB). Recommended minimum is 4096MB."
    fi

    print_substep "Checking disk space..."
    local available_space=$(df -k . | awk 'NR==2 {print $4}')
    if [ "${available_space}" -lt 10485760 ]; then # 10GB
        print_warning "Low disk space detected ($(( available_space / 1024 ))MB). Recommended minimum is 10GB."
    fi

    print_substep "Checking CPU cores..."
    local cpu_cores=$(nproc)
    if [ "${cpu_cores}" -lt 2 ]; then
        print_warning "Low CPU cores detected (${cpu_cores}). Recommended minimum is 2 cores."
    fi
}

# Check system requirements
check_system_requirements() {
    print_step "Checking system requirements"
    
    # Check Docker and Docker Compose
    check_docker || return 1
    check_docker_compose || return 1
    
    # Check system resources
    check_system_resources
    
    print_status "System requirements check completed"
    return 0
}

# Create and set up directories
create_directories() {
    print_step "Creating required directories"
    
    local dirs=(
        "${SHH_DATA_DIR}"
        "${SHH_DATA_DIR}/logs"
        "${SHH_DATA_DIR}/data"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "${dir}" ]; then
            print_substep "Creating directory: ${dir}"
            sudo mkdir -p "${dir}"
            sudo chown -R "${USER}:${USER}" "${dir}"
            sudo chmod -R 755 "${dir}"
        else
            print_substep "Directory exists: ${dir}"
        fi
    done
    
    print_success "Created required directories in ${SHH_DATA_DIR}"
}

# Setup environment file
setup_env() {
    print_step "Setting up environment"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        if [ ! -f .env.example ]; then
            print_error "No .env.example file found" "Cannot create .env file"
            return 1
        fi
        
        print_substep "Creating .env from .env.example"
        cp .env.example .env
        
        # Generate random secrets
        local jwt_secret=$(openssl rand -hex 32)
        local session_secret=$(openssl rand -hex 32)
        local cookie_secret=$(openssl rand -hex 32)
        
        # Update secrets in .env
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=${jwt_secret}/" .env
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=${session_secret}/" .env
        sed -i "s/COOKIE_SECRET=.*/COOKIE_SECRET=${cookie_secret}/" .env
        
        print_warning "Please update the following in your .env file:"
        echo "  - Database credentials"
        echo "  - API keys"
        echo "  - External service URLs"
        echo "  - Other environment-specific settings"
    else
        print_substep ".env file exists"
        
        # Check for missing variables
        local missing=false
        while IFS= read -r line; do
            if [[ "${line}" =~ ^[A-Z_]+=$ ]]; then
                print_warning "Empty value for ${line%=}"
                missing=true
            fi
        done < .env
        
        if [ "${missing}" = true ]; then
            print_warning "Please set values for empty variables in .env"
        fi
    fi
    
    print_success "Environment setup completed"
    return 0
}

# Set permissions
setup_permissions() {
    print_step "Setting up permissions"
    
    # Ensure script files are executable
    find scripts -type f -name "*.sh" -exec chmod +x {} \;
    
    # Set proper ownership for data directories
    if [ -d "${SHH_DATA_DIR}" ]; then
        sudo chown -R "${USER}:${USER}" "${SHH_DATA_DIR}"
        sudo chmod -R 755 "${SHH_DATA_DIR}"
    fi
    
    print_success "Permissions setup completed"
}

# Check service health
check_health() {
    local timeout=${1:-300}
    local interval=5
    local elapsed=0
    local healthy=false
    
    print_substep "Checking service health (timeout: ${timeout}s)..."
    
    while [ ${elapsed} -lt ${timeout} ]; do
        local unhealthy=false
        
        # Check each service
        while IFS= read -r container; do
            local health=$(docker inspect --format='{{.State.Health.Status}}' "${container}" 2>/dev/null)
            local running=$(docker inspect --format='{{.State.Running}}' "${container}" 2>/dev/null)
            
            if [ "${health}" = "unhealthy" ] || [ "${running}" != "true" ]; then
                unhealthy=true
                break
            fi
        done < <(${DOCKER_COMPOSE} ps -q)
        
        if [ "${unhealthy}" = false ]; then
            healthy=true
            break
        fi
        
        sleep ${interval}
        elapsed=$((elapsed + interval))
        
        print_substep "Still waiting... (${elapsed}/${timeout}s)"
    done
    
    if [ "${healthy}" = true ]; then
        print_success "All services are healthy"
        return 0
    else
        print_error "Health check timeout" "Services did not become healthy within ${timeout}s"
        return 1
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-pull)
                SKIP_PULL=true
                shift
                ;;
            --no-cache)
                NO_CACHE=true
                shift
                ;;
            --force-recreate)
                FORCE_RECREATE=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "  ____  _   _ _   _ "
    echo " / ___|| | | | | | |"
    echo " \___ \| |_| | |_| |"
    echo "  ___) |  _  |  _  |"
    echo " |____/|_| |_|_| |_|"
    echo -e "${NC}"
    echo "Secure Shell/Hosting"
    echo
}
