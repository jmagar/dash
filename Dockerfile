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

# Create necessary directories with proper permissions
RUN mkdir -p logs static/css static/js/modules templates/components config && \
    chmod -R 777 logs && \
    chmod -R 755 config

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Set proper permissions
RUN chown -R nobody:users /app && \
    chmod -R 755 . && \
    chmod -R 777 logs && \
    chmod -R 755 config && \
    chmod 777 /app && \
    mkdir -p /var/log/supervisor && \
    chown -R nobody:users /var/log/supervisor && \
    chmod -R 777 /var/log/supervisor

USER nobody

EXPOSE 5000

CMD ["supervisord", "-c", "/app/supervisord.conf"]
