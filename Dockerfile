FROM node:18-alpine as base

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssh-client

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Create SSH directory
RUN mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

# Build frontend
RUN npm run build

# Expose ports
EXPOSE 3000 4000

# Start both frontend and backend
CMD ["sh", "-c", "npm run dev:server & npm start -- --host 0.0.0.0"]
