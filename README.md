# 🚀 SSH Host Hub (shh)

A modern, secure SSH host management system with real-time monitoring and AI-powered assistance.

## ✨ Features

### 🔐 SSH Connection Management
- Secure connection pooling with automatic recovery
- Key-based and password authentication
- Session persistence and automatic reconnection
- Real-time connection health monitoring
- Connection pooling with configurable limits

### 🖥️ Terminal Emulation
- Full terminal emulation via xterm.js
- Real-time command execution and output
- Command history with search
- Split terminal support
- Custom terminal themes
- Session recording and playback

### 📂 File Management
- SFTP file operations (upload/download)
- Directory browsing with permissions
- File search capabilities
- Drag-and-drop support
- Progress tracking for transfers
- Bulk operations support

### 🐳 Docker Integration
- Container management (start/stop/restart)
- Container logs with real-time streaming
- Resource usage monitoring
- Docker Compose support
- Image management
- Network configuration

### 📦 Package Management
- System package installation/removal
- Version management
- Package search functionality
- Multi-platform support (apt, yum, etc.)
- Update notifications
- Dependency resolution

### 🤖 AI Assistant
- Command suggestions based on context
- Error explanation and resolution
- Security best practices
- Performance optimization tips
- Custom command generation
- Learning from user interactions

### 📊 Monitoring
- Real-time resource metrics
- Custom alert thresholds
- Historical data tracking
- Performance analytics
- Health check monitoring
- Metric visualization

### 🔔 Notifications
- Gotify integration for critical alerts
- Customizable notification rules
- Multi-channel support
- Alert aggregation
- Priority-based routing
- Notification history

### 🔒 Security
- Role-based access control (RBAC)
- Two-factor authentication (2FA)
- Session management
- Audit logging
- IP-based access control
- Security policy enforcement

## 🛠️ Tech Stack

- 🖥️ **Frontend**: React 18, Material-UI
- 🔧 **Backend**: Node.js 20, Express
- 📝 **Language**: TypeScript 4.9
- 🗄️ **Database**: PostgreSQL 16
- 💾 **Cache**: Redis
- 🐳 **Containerization**: Docker
- 📡 **Real-time**: Socket.IO
- 🧠 **AI**: OpenAI GPT-4/OpenRouter

## 🌍 Environment Variables

### 🔑 Required Variables
```env
# Server
NODE_ENV=development                 # Application environment (development/production/test)
PORT=3000                           # Server port
HOST=localhost                      # Server host
MAX_REQUEST_SIZE=10485760          # Maximum request size (10MB)

# Database
DB_HOST=localhost                   # PostgreSQL host
DB_PORT=5432                       # PostgreSQL port
DB_USER=postgres                   # Database user
DB_PASSWORD=postgres               # Database password
DB_NAME=shh                        # Database name

# JWT
JWT_SECRET=your-secret-key         # JWT signing secret
JWT_EXPIRY=1h                      # JWT expiration time
JWT_REFRESH_EXPIRY=7d             # JWT refresh token expiration
```

### 🔄 Optional Variables
```env
# Redis Configuration
REDIS_HOST=localhost               # Redis host
REDIS_PORT=6379                   # Redis port
REDIS_PASSWORD=                   # Redis password (optional)

# CORS Settings
CORS_ORIGIN=http://localhost:3000 # Allowed CORS origin
CORS_METHODS=GET,POST,PUT,DELETE  # Allowed HTTP methods
CORS_CREDENTIALS=true             # Allow credentials

# Rate Limiting
RATE_LIMIT_WINDOW=900000         # Rate limit window (15 minutes)
RATE_LIMIT_MAX=100              # Maximum requests per window

# File Upload
MAX_FILE_SIZE=52428800         # Maximum file upload size (50MB)

# Logging
LOG_LEVEL=info                # Log level (debug/info/warn/error)
LOG_FILE=logs/app.log        # Log file path

# Monitoring
PROMETHEUS_PORT=9090         # Prometheus metrics port

# AI Integration (Optional)
OPENAI_API_KEY=             # OpenAI API key
OPENAI_MODEL=gpt-4         # OpenAI model to use
OPENAI_ORG=                # OpenAI organization ID
OPENAI_MAX_TOKENS=2000    # Maximum tokens per request
OPENAI_TEMPERATURE=0.7    # Model temperature

# OpenRouter Integration (Optional)
OPENROUTER_API_KEY=       # OpenRouter API key
OPENROUTER_MODEL=anthropic/claude-2  # OpenRouter model
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_MAX_TOKENS=2000
OPENROUTER_TEMPERATURE=0.7

# Notifications (Optional)
GOTIFY_URL=               # Gotify server URL
GOTIFY_TOKEN=            # Gotify application token
```

### 🐳 Docker Specific Variables
```env
# These are automatically set in docker-compose.yml
POSTGRES_USER=postgres   # PostgreSQL user for Docker
POSTGRES_PASSWORD=postgres  # PostgreSQL password for Docker
POSTGRES_DB=shh           # PostgreSQL database for Docker
```

### 🔐 Security Recommendations
- Always use strong, unique values for secrets
- Keep production environment variables secure
- Rotate secrets regularly
- Use different values for development and production
- Never commit environment files to version control

## 🚀 Installation

### Prerequisites

- 🐳 Docker and Docker Compose
- 📦 Node.js 20.x (for development)
- 🐘 PostgreSQL 16 (handled by Docker)
- ⚡ Redis (handled by Docker)

### 🛠️ Available Scripts

#### `deploy.sh` - Production Deployment
```bash
./scripts/deploy.sh [--no-cache] [--force-recreate]
```
Handles complete production deployment:
- ✅ Verifies Docker installation
- 📁 Creates required directories (logs, data)
- 🔑 Sets correct permissions
- 🏗️ Builds Docker images
- 🚀 Starts all services
- 🏥 Monitors service health
- 📝 Displays service status and logs

Options:
- `--no-cache`: Force rebuild without using cache
- `--force-recreate`: Recreate containers even if config unchanged

#### `dev.sh` - Development Environment
```bash
./scripts/dev.sh [--frontend-only | --backend-only] [--watch]
```
Sets up development environment:
- 🔧 Starts required services (PostgreSQL, Redis)
- 🏥 Verifies service health
- 🚀 Launches development servers
- 📝 Enables hot-reloading

Options:
- `--frontend-only`: Start only frontend development server
- `--backend-only`: Start only backend development server
- `--watch`: Enable watch mode for automatic rebuilds

#### `cleanup.sh` - Environment Cleanup
```bash
./scripts/cleanup.sh [--volumes] [--images]
```
Cleans up Docker resources:
- 🧹 Stops all containers
- 🗑️ Removes containers
- 💽 Optionally removes volumes
- 🖼️ Optionally removes images

Options:
- `--volumes`: Also remove Docker volumes
- `--images`: Also remove Docker images

#### `migrate.ts` - Database Management
```bash
npm run migrate [up|down|create] [migration-name]
```
Handles database migrations:
- ⬆️ `up`: Apply pending migrations
- ⬇️ `down`: Revert last migration
- ✨ `create`: Create new migration

Example:
```bash
# Apply migrations
npm run migrate up

# Create new migration
npm run migrate create add-user-table
```

#### `update-imports.sh` - Import Management
```bash
./scripts/update-imports.sh [directory]
```
Updates TypeScript imports:
- 🔄 Fixes import paths
- 🔍 Updates import statements
- ✅ Verifies import validity

### 🐳 Quick Start (Production)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/shh.git
   cd shh
   ```

2. Deploy with production script:
   ```bash
   ./scripts/deploy.sh
   ```

3. Access at http://localhost:3000 🎉

### 👩‍💻 Development Setup

1. Clone and prepare:
   ```bash
   git clone https://github.com/yourusername/shh.git
   cd shh
   ```

2. Start development environment:
   ```bash
   ./scripts/dev.sh
   ```

3. Access development server at http://localhost:3000

### 🧪 Testing

```bash
# Run all tests
npm test

# Run specific tests
npm test -- --grep "pattern"

# Watch mode
npm test -- --watch
```

### 🔄 Common Workflows

#### Fresh Development Setup
```bash
git clone https://github.com/yourusername/shh.git
cd shh
./scripts/cleanup.sh --volumes  # Clean existing setup
./scripts/dev.sh               # Start development
```

#### Update and Rebuild
```bash
git pull                       # Get latest changes
./scripts/cleanup.sh          # Clean containers
./scripts/deploy.sh --no-cache # Rebuild and deploy
```

#### Database Reset
```bash
./scripts/cleanup.sh --volumes # Remove volumes
./scripts/dev.sh              # Start fresh
npm run migrate up            # Apply migrations
```

## 🔔 Notifications

The system uses Gotify for critical notifications:

- ⚠️ Server errors (500-level)
- 🔌 Host connection issues
- 💽 Disk space alerts (>90% usage)
- 🧠 Memory alerts (>95% usage)
- 🌡️ CPU load alerts
- 🏗️ System overload warnings

## 🔒 Security Features

- 🔑 JWT authentication
- 🔐 SSH key management
- 🛡️ Rate limiting
- 🧬 Input validation
- 🔍 Activity logging
- 🚫 CORS protection
- 🛠️ Security headers (Helmet)

## 📦 Docker Support

The application uses multi-stage Docker builds:

- 🏗️ Development: Hot-reloading, debugging
- 🚀 Production: Optimized, minimal image
- 🧪 Test: Isolated testing environment

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT integration
- Material-UI for components
- The Node.js community
