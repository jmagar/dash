FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    curl \
    docker.io \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p logs && \
    mkdir -p static/css && \
    mkdir -p static/js/modules && \
    mkdir -p templates/components && \
    mkdir -p server

# Copy application files
COPY app.py .
COPY watcher.py .
COPY server/ server/
COPY templates/ templates/
COPY static/ static/

# Set permissions
RUN chmod -R 755 /app && \
    chmod +x app.py watcher.py

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV SHELL=/bin/bash
ENV PYTHONPATH=/app

# Expose HTTP and WebSocket ports
EXPOSE 5000
EXPOSE 5001

# Run as root to ensure Docker socket access
USER root

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Command to run the service (will be overridden by docker-compose for watcher)
CMD ["python", "app.py"]
