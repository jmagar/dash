# SSH Remote Management Backend

Backend service for SSH Remote Management, providing secure remote server management through SSH, SFTP, and Docker.

## Features

- 🔐 Secure Authentication with JWT and MFA
- 🖥️ SSH Terminal with Command History
- 📁 SFTP File Management
- 📦 Package Management (APT/YUM)
- 🐳 Docker Container Management
- 🚀 Real-time Updates via WebSocket
- 💾 PostgreSQL for Persistent Storage
- ⚡ Redis for Caching and Rate Limiting

## Prerequisites

- Node.js >= 16.0.0
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 6+

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/yourusername/shh.git
cd shh/backend
```

1. Install dependencies:

```bash
npm install
```

1. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

1. Start the services:

```bash
docker compose up
```

The server will be available at `http://localhost:4000`.

## Development

Start the development server with hot reload:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

## API Routes

### Authentication

- POST /api/auth/login - Login with username/password
- POST /api/auth/validate - Validate JWT token
- POST /api/auth/refresh - Refresh JWT token
- POST /api/auth/logout - Logout user

### Hosts

- GET /api/hosts - List all hosts
- GET /api/hosts/:id - Get host details
- POST /api/hosts - Create new host
- PATCH /api/hosts/:id - Update host
- DELETE /api/hosts/:id - Delete host
- POST /api/hosts/:id/test - Test connection

### Terminal

- WebSocket /terminal - Terminal connection
- GET /api/:hostId/history - Get command history

### Files

- GET /api/files/:hostId/list - List directory contents
- GET /api/files/:hostId/download - Download file
- POST /api/files/:hostId/upload - Upload file
- DELETE /api/files/:hostId - Delete file/directory

### Packages

- GET /api/packages/:hostId/list - List installed packages
- POST /api/packages/:hostId/install - Install package
- POST /api/packages/:hostId/uninstall - Uninstall package
- POST /api/packages/:hostId/update - Update package
- GET /api/packages/:hostId/updates - Check for updates

### Docker

- GET /api/docker/containers - List containers
- POST /api/docker/containers/:id/start - Start container
- POST /api/docker/containers/:id/stop - Stop container
- DELETE /api/docker/containers/:id - Delete container
- GET /api/docker/stacks - List stacks

## Caching Strategy

- Session data: 30 minutes TTL
- User data: 1 hour TTL
- Command history: 1 day TTL
- Docker state: 30 seconds TTL
- Package lists: 5 minutes TTL

## Security

- JWT-based authentication
- Role-based access control
- Rate limiting
- SSH key management
- Path traversal prevention
- Input validation
- CORS configuration

## Error Handling

All API endpoints return responses in the format:

```json
{
  "success": boolean,
  "data": any | null,
  "error": string | null
}
```

## Contributing

1. Fork the repository
1. Create your feature branch
1. Commit your changes
1. Push to the branch
1. Create a Pull Request

## License

MIT License - see LICENSE for details
