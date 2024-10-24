FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    curl \
    gcc \
    python3-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create required directories
RUN mkdir -p \
    /app/logs \
    /app/config \
    /compose \
    /proxy-conf \
    /app/run

# Create log files
RUN touch \
    /app/logs/supervisord.log \
    /app/logs/gunicorn.log \
    /app/logs/watcher.log \
    /app/run/supervisor.sock

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Set proper permissions
RUN chown -R nobody:users \
        /app \
        /compose \
        /proxy-conf && \
    chmod -R 755 /app && \
    chmod -R 777 /app/logs && \
    chmod -R 777 /app/run && \
    chmod 755 /app/config && \
    chmod 755 /compose && \
    chmod 755 /proxy-conf

USER nobody

EXPOSE 5000

CMD ["supervisord", "-n", "-c", "/app/supervisord.conf"]
