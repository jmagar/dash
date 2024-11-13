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

# Copy package files first to leverage layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies) in one command
RUN npm install --legacy-peer-deps && \
    npm install -g typescript && \
    npm config set legacy-peer-deps true

# Copy configuration files
COPY tsconfig*.json ./
COPY .eslintrc.* ./
COPY .prettierrc.js ./

# Copy source code and public assets
COPY src ./src
COPY public ./public

# Create empty .env file if none exists
RUN touch .env

# Clean and build with explicit TypeScript path
RUN npm run clean && \
    npm run build && \
    npm run build:server

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install SSH client for remote execution
RUN apk add --no-cache openssh-client

# Set production mode
ENV NODE_ENV=production
ENV REACT_APP_DISABLE_AUTH=true

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-optional

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
