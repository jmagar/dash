FROM node:18-alpine AS builder

WORKDIR /app

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssh-client

# Set production mode
ENV NODE_ENV=production
ENV SKIP_PREFLIGHT_CHECK=true

# Copy package files first to leverage layer caching
COPY package*.json ./

# Install dependencies and necessary build tools
RUN npm install --force && \
    npm install -g react-scripts typescript

# Copy source files
COPY tsconfig*.json ./
COPY .env.production ./
COPY src ./src
COPY public ./public

# Clean and build
RUN rm -rf dist build && \
    npm run build:all

# Production stage
FROM node:18-alpine

WORKDIR /app

# Set production mode
ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev --force --no-optional

# Copy built files
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.production ./

# Create SSH directory with proper permissions
RUN mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

# Expose port
EXPOSE 4000

# Start unified application
CMD ["npm", "start"]
