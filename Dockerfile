# Node.js build stage
FROM node:20-slim AS node-builder

WORKDIR /app

# Install Python and pip with minimal dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-minimal \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install mem0ai in virtual environment
RUN pip install mem0ai

# Copy package files first for better caching
COPY package*.json .npmrc ./

# Copy Prisma schema before installing dependencies
COPY prisma ./prisma/

# Install Prisma CLI globally first
RUN npm install -g prisma

# Set database URL for Prisma using environment variables
ARG POSTGRES_USER
ARG POSTGRES_PASSWORD
ARG POSTGRES_DB
ARG POSTGRES_HOST
ENV DATABASE_URL="postgresql://${POSTGRES_USER:-shh_user}:${POSTGRES_PASSWORD}@${POSTGRES_HOST:-postgres}:5432/${POSTGRES_DB:-shh}"
ENV POSTGRES_HOST=postgres

# Install production dependencies first
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Install dev dependencies for build
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source files and configs
COPY src ./src
COPY public ./public
COPY .eslintrc.* ./
COPY .prettierrc.js ./
COPY .babelrc ./
COPY tsconfig*.json ./
COPY craco.config.cjs ./

# Generate Prisma client
RUN npm run prisma:generate

# Build client and server
RUN npm run build

# Go build stage for agent
FROM golang:1.21-alpine AS agent-builder

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libpcap-dev \
    make

WORKDIR /build

# Copy go mod files
COPY agent/go.mod agent/go.sum ./
RUN go mod download

# Copy source code
COPY agent .

# Build the binary with CGO enabled for libpcap support
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o shh-agent ./cmd/agent

# Final stage
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    rsyslog \
    libpcap-dev \
    tzdata \
    ca-certificates \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r shh && useradd -r -g shh -m -d /home/shh -s /bin/false shh

WORKDIR /app

# Copy Python virtual environment
COPY --from=node-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only production files
COPY --from=node-builder /app/package*.json ./
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/build ./build
COPY --from=node-builder /app/prisma ./prisma

# Generate Prisma client in production
RUN npm run prisma:generate

# Copy agent binary
COPY --from=agent-builder /build/shh-agent /usr/local/bin/shh-agent

# Copy configuration files
COPY config/host-agent.json /etc/shh/agent.json
COPY config/rsyslog.conf /etc/rsyslog.conf

# Create required directories and set permissions
RUN mkdir -p /home/shh/.local/share/shh/logs && \
    chown -R shh:shh /app /home/shh

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Switch to non-root user
USER shh

# Expose ports
EXPOSE 3000 1514 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
    CMD nc -z localhost $PORT || exit 1

CMD ["node", "dist/server/server.js"]
