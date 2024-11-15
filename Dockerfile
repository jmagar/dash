FROM node:18-alpine AS builder

WORKDIR /app

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssh-client

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source code and configs
COPY . .

# Build
RUN npm run build:all

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies
RUN apk add --no-cache \
    openssh-client \
    wget \
    curl \
    docker-cli

# Create required directories
RUN mkdir -p /app/logs && \
    mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh && \
    mkdir -p /app/scripts

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --ignore-scripts --omit=dev --omit=optional

# Copy built files
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist

# Set permissions
RUN chown -R node:node /app && \
    chmod -R 755 /app && \
    chown -R node:node /app/scripts

# Switch to non-root user
USER node

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --spider http://localhost:4000/api/health || exit 1

# Start command
CMD ["npm", "start"]
