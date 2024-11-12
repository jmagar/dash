# SSH Remote Management Dashboard

A comprehensive web-based SSH management system that provides secure remote server access with features for terminal sessions, file management, Docker containers, and system package management.

## Core Architecture

### Backend Infrastructure
- **Server**: Node.js/Express with TypeScript
- **Database**: PostgreSQL for persistent storage
  - User management with roles and MFA support
  - Host configurations and SSH key management
  - Command history tracking
- **Caching**: Redis for session management and real-time data
- **WebSocket**: Real-time terminal sessions and updates
- **SSH Management**: Connection pooling with automatic reconnection
- **Security**: JWT authentication with role-based access control

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Components**: Material-UI v5
- **State Management**: Context-based with dedicated providers
  - HostContext: Manages SSH host connections
  - UserContext: Handles authentication state
  - ThemeContext: Controls UI theme preferences
- **Custom Hooks**:
  - useAsync: Manages async operations with loading/error states
  - Various utility hooks for UI interactions

## Key Features

### SSH Connection Management
- **Connection Pooling**:
  - Persistent SSH connections with automatic recovery
  - Connection health monitoring
  - Configurable keepalive settings
- **Authentication**:
  - Password and key-based authentication
  - MFA support
  - Role-based access control

### Terminal Emulation
- **Interactive Terminal**:
  - Full terminal emulation via xterm.js
  - Real-time command execution
  - Command history with Redis caching
  - Session persistence
- **WebSocket Integration**:
  - Real-time data streaming
  - Automatic reconnection
  - Terminal resize support

### File Management (SFTP)
- **Operations**:
  - Directory listing with permissions
  - File upload/download
  - File/directory deletion
- **Security**:
  - Path traversal prevention
  - Permission validation
  - Secure file transfers

### Docker Integration
- **Container Management**:
  - List/start/stop/remove containers
  - Container logs and stats
  - Real-time status updates
- **Stack Management**:
  - Docker Compose support
  - Stack deployment
  - Configuration management

### Package Management
- **System Packages**:
  - Package installation/removal
  - Version updates
  - Package search
- **Multi-Platform**:
  - APT/YUM support
  - Package manager detection

### Security Features
- **Authentication**:
  - JWT-based session management
  - MFA support
  - Role-based access control
- **Data Protection**:
  - Password hashing with bcrypt
  - SSH key encryption
  - HTTPS enforcement
- **Access Control**:
  - Rate limiting
  - IP filtering
  - Session management

## Technical Implementation

### Database Schema
\`\`\`sql
-- Core tables
users (id, username, email, password_hash, role, mfa_enabled)
hosts (id, name, hostname, port, username, ssh_key_id)
ssh_keys (id, name, private_key, public_key, user_id)
command_history (id, user_id, host_id, command, output, exit_code)
\`\`\`

### API Structure
\`\`\`typescript
// Core endpoints
/api/auth     # Authentication & user management
/api/hosts    # SSH host management
/api/files    # SFTP operations
/api/docker   # Container management
/api/packages # System package management
/api/execute  # Remote command execution
\`\`\`

### Connection Management
\`\`\`typescript
// SSH connection pool
const connectionPool = new Map<string, Client>();

// Connection configuration
const CONNECTION_TIMEOUT = 5000;
const KEEP_ALIVE_INTERVAL = 10000;
const KEEP_ALIVE_COUNT_MAX = 3;
\`\`\`

## Setup & Development

### Prerequisites
- Node.js >= 16.0.0
- PostgreSQL
- Redis
- Docker (optional)

### Local Development

1. Clone and install dependencies:
\`\`\`bash
git clone https://github.com/yourusername/shh.git
cd shh
npm install
\`\`\`

2. Configure environment:
\`\`\`bash
cp .env.example .env
# Edit .env with your settings
\`\`\`

3. Initialize database:
\`\`\`bash
npm run migrate
\`\`\`

4. Start development servers:
\`\`\`bash
# All services
npm run dev

# Or individually
npm run dev:client  # Frontend only
npm run dev:server  # Backend only
\`\`\`

### Docker Deployment
\`\`\`bash
docker compose up
\`\`\`

## Configuration

### Environment Variables
\`\`\`bash
# Application
PORT=4000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=shh

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-secret-key
JWT_EXPIRATION=30m
\`\`\`

## Project Structure
\`\`\`
src/
├── client/
│   ├── api/          # API clients
│   ├── components/   # React components
│   ├── context/      # State management
│   ├── hooks/        # Custom hooks
│   └── utils/        # Frontend utilities
├── server/
│   ├── api/          # API implementations
│   ├── middleware/   # Express middleware
│   ├── routes/       # API routes
│   └── utils/        # Backend utilities
└── types/            # Shared TypeScript types
\`\`\`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE for details
