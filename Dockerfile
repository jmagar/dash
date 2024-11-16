# Node.js build stage
FROM node:20-slim AS node-builder

WORKDIR /app

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install mem0ai in virtual environment
RUN pip install mem0ai

# Install dependencies with increased memory limit for CopilotKit
COPY package*.json ./
RUN NODE_OPTIONS="--max-old-space-size=4096" npm install

# Copy source code
COPY . .

# Build client with increased memory limit
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build:client

# Build server
RUN npm run build:server

# Go build stage for agent
FROM golang:1.21-alpine AS agent-builder

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libpcap-dev \
    make

WORKDIR /build

# Copy agent source
COPY agent/go.mod agent/go.sum ./
RUN go mod download

COPY agent .

# Build the agent binary with CGO enabled for libpcap support
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o shh-agent ./cmd/agent

# Postgres stage
FROM postgres:16 AS postgres

# Install pgvector
RUN apt-get update \
    && apt-get install -y postgresql-server-dev-16 build-essential git \
    && git clone https://github.com/pgvector/pgvector.git \
    && cd pgvector \
    && make \
    && make install \
    && cd .. \
    && rm -rf pgvector \
    && apt-get remove -y postgresql-server-dev-16 build-essential git \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy init scripts
COPY db/init.sql /docker-entrypoint-initdb.d/

# Final stage
FROM node:20-slim AS app

WORKDIR /app

# Install required packages
RUN apt-get update && apt-get install -y \
    rsyslog \
    libpcap-dev \
    tzdata \
    ca-certificates \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy Python virtual environment
COPY --from=node-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy built Node.js assets
COPY --from=node-builder /app/build ./build
COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/package*.json ./

# Copy agent binary and configs
COPY --from=agent-builder /build/shh-agent /usr/local/bin/shh-agent
COPY config/host-agent.json /etc/shh/agent.json
COPY config/rsyslog.conf /etc/rsyslog.conf

# Create required directories with proper permissions
RUN mkdir -p \
    /var/log/shh/agents \
    /var/log/shh/local-agent \
    /var/lib/shh \
    /etc/shh \
    /var/spool/rsyslog \
    && chmod +x /usr/local/bin/shh-agent \
    && chmod 600 /etc/shh/agent.json \
    && chmod 644 /etc/rsyslog.conf \
    && chmod -R 755 /var/log/shh \
    && chmod 755 /var/spool/rsyslog

# Install production dependencies only
RUN npm install --only=production

# Set environment variables
ENV NODE_ENV=production
ENV SYSLOG_SERVER=localhost:1514
ENV SYSLOG_PROTOCOL=tcp
ENV SYSLOG_FACILITY=local0

EXPOSE 3000
EXPOSE 1514

# Create entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/server/index.js"]
