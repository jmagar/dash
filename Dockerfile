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

# Remove any existing servers.json
RUN rm -f /app/config/servers.json

# Set proper permissions
RUN chown -R nobody:nogroup /app && \
    chmod -R 755 . && \
    chmod -R 777 logs && \
    chmod -R 755 config

USER nobody

EXPOSE 5000

CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]
