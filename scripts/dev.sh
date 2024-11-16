#!/bin/bash

# Exit on error
set -e

# Load utilities
source "$(dirname "$0")/utils.sh"

# Parse command line arguments
parse_args "$@"

# Main development flow
main() {
    print_status "Starting SSH Host Hub (shh) development environment..."
    
    check_system_requirements
    create_directories
    setup_env
    setup_db_permissions

    # Start required services
    print_status "Starting development services..."
    docker compose up -d db redis

    # Check service health
    check_health 60 "db redis" || exit 1

    # Start development servers
    print_status "Starting development servers..."
    if [ "${FRONTEND_ONLY:-}" = true ]; then
        if [ "${WATCH_MODE:-}" = true ]; then
            print_status "Starting frontend in watch mode..."
            npm run dev:client:watch
        else
            npm run dev:client
        fi
    elif [ "${BACKEND_ONLY:-}" = true ]; then
        if [ "${WATCH_MODE:-}" = true ]; then
            print_status "Starting backend in watch mode..."
            npm run dev:server:watch
        else
            npm run dev:server
        fi
    else
        if [ "${WATCH_MODE:-}" = true ]; then
            print_status "Starting all services in watch mode..."
            npm run dev:watch
        else
            npm run dev
        fi
    fi
}

# Run development setup
main
