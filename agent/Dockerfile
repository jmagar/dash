# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libpcap-dev \
    make

WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o shh-agent ./cmd/agent

# Final stage
FROM alpine:3.18

# Install runtime dependencies
RUN apk add --no-cache \
    libpcap \
    tzdata \
    ca-certificates

# Create agent directories
RUN mkdir -p /etc/shh-agent \
    /var/log/shh-agent \
    /var/lib/shh-agent

WORKDIR /

# Copy binary from builder
COPY --from=builder /build/shh-agent /usr/local/bin/shh-agent

# Copy default config
COPY config/agent.json /etc/shh-agent/config.json

# Set permissions
RUN chmod +x /usr/local/bin/shh-agent && \
    chmod 600 /etc/shh-agent/config.json

# Run as non-root user
RUN addgroup -S shh && adduser -S shh -G shh
USER shh

ENTRYPOINT ["/usr/local/bin/shh-agent"]
