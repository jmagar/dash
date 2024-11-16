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

# Function to start rsyslog
start_rsyslog() {
    echo "Starting rsyslog..."

    # Ensure proper permissions
    chmod 644 /etc/rsyslog.conf
    chmod -R 755 /var/log/shh
    chmod 755 /var/spool/rsyslog

    # Start rsyslog
    if ! service rsyslog start; then
        echo >&2 "Failed to start rsyslog"
        exit 1
    fi

    # Wait for rsyslog to be ready
    sleep 2
    if ! nc -z localhost 1514; then
        echo >&2 "Rsyslog failed to bind to port 1514"
        exit 1
    fi

    echo "Rsyslog started successfully"
}

# Function to start the agent
start_agent() {
    echo "Starting shh-agent..."

    # Ensure proper permissions
    chmod +x /usr/local/bin/shh-agent
    chmod 600 /etc/shh/agent.json

    # Start the agent
    /usr/local/bin/shh-agent --config /etc/shh/agent.json &

    # Store agent PID
    AGENT_PID=$!

    # Wait briefly to ensure agent starts
    sleep 2

    # Check if agent is still running
    if ! kill -0 $AGENT_PID 2>/dev/null; then
        echo >&2 "Agent failed to start"
        exit 1
    fi

    echo "Agent started successfully (PID: $AGENT_PID)"
}

# Start services
start_rsyslog
start_agent

# Wait for required services
if [ -n "$POSTGRES_HOST" ] && [ -n "$POSTGRES_PORT" ]; then
    wait_for "$POSTGRES_HOST" "$POSTGRES_PORT" "PostgreSQL"
fi

if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
    wait_for "$REDIS_HOST" "$REDIS_PORT" "Redis"
fi

# Execute the main command
exec "$@"
