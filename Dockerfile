FROM node:18-alpine AS builder

WORKDIR /app

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssh-client

# Set environment variables
ENV NODE_ENV=production
ENV DOCKER_BUILD=1
ENV SKIP_PREFLIGHT_CHECK=true
ENV CI=true
ENV DISABLE_AUTH=true
ENV REACT_APP_DISABLE_AUTH=true
ENV REACT_APP_WDS_SOCKET_PORT=0
ENV BABEL_ENV=production
ENV DISABLE_ESLINT_PLUGIN=true

# Copy npm and Babel configs first
COPY .npmrc package*.json .babelrc babel.config.js ./

# Install dependencies with specific versions
RUN npm install --no-package-lock \
    @babel/core@7.23.7 \
    @babel/runtime@7.23.7 \
    @babel/plugin-proposal-private-property-in-object@7.21.11 \
    @babel/plugin-transform-private-property-in-object@7.23.4 \
    @babel/plugin-proposal-class-properties@7.18.6 \
    @babel/plugin-transform-class-properties@7.23.3 \
    @babel/plugin-proposal-private-methods@7.18.6 \
    @babel/plugin-transform-private-methods@7.23.3 \
    babel-preset-react-app@10.0.1 \
    rimraf@5.0.5 \
    typescript@4.9.5

# Install remaining dependencies
RUN npm install --ignore-scripts && \
    npm install -g typescript@4.9.5 rimraf@5.0.5

# Copy configuration files
COPY tsconfig*.json ./

# Copy source code and public assets
COPY src ./src
COPY public ./public

# Clean and build
RUN rimraf dist build && \
    npm run build && \
    npm run build:server

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    openssh-client \
    wget \
    curl \
    docker-cli

# Set environment variables
ENV NODE_ENV=production
ENV DOCKER_BUILD=1
ENV DISABLE_AUTH=true
ENV REACT_APP_DISABLE_AUTH=true
ENV SKIP_PREFLIGHT_CHECK=true
ENV CI=true

# Create required directories with proper permissions
RUN mkdir -p /app/logs && \
    mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh && \
    chown -R node:node /app && \
    chmod -R 755 /app

# Copy npm config and package files
COPY --chown=node:node .npmrc package*.json ./

# Install only production dependencies
RUN npm install --ignore-scripts --omit=dev --omit=optional

# Copy built files
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/dist ./dist

# Create script directory
RUN mkdir -p /app/scripts && \
    chown -R node:node /app/scripts

# Switch to non-root user for most operations
USER node

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --spider http://localhost:4000/api/health || exit 1

# Start application
CMD ["npm", "start"]
