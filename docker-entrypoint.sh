#!/bin/sh
set -e

# Function to wait for a service
wait_for() {
    local host="$1"
    local port="$2"
    local service="$3"
    local retries=30
    local wait=1

    echo "Waiting for $service to be ready..."
    while ! nc -z "$host" "$port"; do
        retries=$((retries - 1))
        if [ $retries -eq 0 ]; then
            echo >&2 "$service is not available"
            exit 1
        fi
        sleep $wait
    done
    echo "$service is ready!"
}

# Wait for required services
if [ -n "$POSTGRES_HOST" ] && [ -n "$POSTGRES_PORT" ]; then
    wait_for "$POSTGRES_HOST" "$POSTGRES_PORT" "PostgreSQL"
fi

if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
    wait_for "$REDIS_HOST" "$REDIS_PORT" "Redis"
fi

# Execute the main command
exec "$@"
