#!/bin/bash

# Exit on error
set -e

# Load utilities
source "$(dirname "$0")/utils.sh"

# Parse command line arguments
parse_args "$@"

# Main cleanup flow
main() {
    print_status "Starting cleanup process..."

    # Stop and remove containers
    print_status "Stopping and removing containers..."
    docker compose down ${REMOVE_VOLUMES:-}

    # Remove unused Docker resources
    print_status "Cleaning up Docker resources..."
    docker system prune -f

    # Remove images if requested
    if [ "${REMOVE_IMAGES:-}" = true ]; then
        print_status "Removing Docker images..."
        docker rmi $(docker images -q) -f 2>/dev/null || true
    fi

    # Clean up logs
    print_status "Cleaning up logs..."
    rm -rf logs/*

    # Clean up data directories if volumes are removed
    if [ -n "${REMOVE_VOLUMES:-}" ]; then
        print_status "Cleaning up data directories..."
        rm -rf data/postgres/* data/redis/*
    fi

    print_status "Cleanup complete! 🧹"
    echo -e "\n${GREEN}To restart the application:${NC}"
    echo -e "- Production: ${YELLOW}./scripts/deploy.sh${NC}"
    echo -e "- Development: ${YELLOW}./scripts/dev.sh${NC}"
}

# Run cleanup
main
