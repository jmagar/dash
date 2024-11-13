FROM node:18-alpine AS builder

WORKDIR /app

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssh-client

# Set production mode and build configuration
ENV NODE_ENV=production
ENV SKIP_PREFLIGHT_CHECK=true
ENV CI=true
ENV REACT_APP_DISABLE_AUTH=true
ENV REACT_APP_WDS_SOCKET_PORT=0

# Configure npm to use a more reliable registry and add retry logic
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Copy package files first to leverage layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm install --legacy-peer-deps --no-optional && \
    npm install -g typescript && \
    npm config set legacy-peer-deps true

# Copy configuration files
COPY tsconfig*.json ./
COPY .eslintrc.json ./
COPY .prettierrc.js ./

# Copy source code and public assets
COPY src ./src
COPY public ./public

# Create empty .env file if none exists
RUN touch .env

# Install additional dependencies that might be needed for the build
RUN npm install --save-dev \
    @types/node \
    @types/react \
    @types/react-dom \
    @typescript-eslint/eslint-plugin \
    @typescript-eslint/parser \
    eslint-import-resolver-typescript \
    eslint-plugin-import \
    eslint-plugin-react \
    eslint-plugin-react-hooks

# Clean and build
RUN npm run clean && \
    SKIP_PREFLIGHT_CHECK=true npm run build && \
    npm run build:server

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install SSH client for remote execution
RUN apk add --no-cache openssh-client

# Set production mode
ENV NODE_ENV=production
ENV REACT_APP_DISABLE_AUTH=true

# Configure npm for production install
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps --no-optional || \
    npm install --only=production --legacy-peer-deps --no-optional

# Copy built files
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist

# Create SSH directory with proper permissions
RUN mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

# Create empty .env file if none exists
RUN touch .env

# Expose port
EXPOSE 4000

# Start unified application
CMD ["npm", "start"]
