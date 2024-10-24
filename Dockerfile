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
    chmod -R 777 config

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Set proper permissions
RUN groupadd -r appuser && \
    useradd -r -g appuser -d /app -s /bin/bash appuser && \
    chown -R appuser:appuser /app && \
    chmod -R 755 . && \
    chmod -R 777 logs && \
    chmod -R 777 config && \
    chmod +x setup.sh && \
    chmod +x watcher.py

USER appuser

EXPOSE 5000 5001

CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]
