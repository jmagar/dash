FROM node:20-slim AS builder

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

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build client
RUN npm run build:client

# Build server
RUN npm run build:server

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

FROM node:20-slim AS app

WORKDIR /app

# Copy Python virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy built assets
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

# Start the server
CMD ["node", "dist/server/index.js"]
