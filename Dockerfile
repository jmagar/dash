FROM node:18-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssh-client

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build:all

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy built files
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist

# Create SSH directory
RUN mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

# Expose port
EXPOSE 4000

# Start unified application
CMD ["npm", "start"]
