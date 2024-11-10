# SSH Remote Management

A modern web interface for managing remote servers through SSH with support for file management, package management, and Docker containers.

## Features

- 🔒 Secure Authentication with JWT and MFA
- 🖥️ Interactive SSH Terminal
- 📁 SFTP File Management
- 📦 Package Management (APT/YUM)
- 🐳 Docker Container Management
- 🚀 Real-time Updates
- 🎨 Material-UI Design
- 🌙 Dark/Light Theme

## Tech Stack

- React with TypeScript
- Material-UI Components
- Node.js/Express
- PostgreSQL Database
- Redis Caching
- WebSocket for Real-time Updates
- SSH2 for Remote Access
- Custom React Hooks
- Context API for State Management

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/yourusername/shh.git
cd shh
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Start the services:

```bash
docker compose up
```

The application will be available at:
- Frontend: `http://localhost:3000`
- API Server: `http://localhost:4000`

## Development

Start the development servers:

```bash
# Start frontend development server
npm start

# Start API server in development mode
npm run dev:server
```

## Project Structure

```plaintext
.
├── src/                    # Source code
│   ├── api/               # API client functions
│   ├── components/        # React components
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── middleware/       # Express middleware
│   ├── pages/            # Page components
│   ├── styles/           # Global styles
│   ├── types/            # TypeScript definitions
│   └── utils/            # Shared utilities
├── routes/               # API routes
├── db/                   # Database migrations
└── docker-compose.yml    # Docker services config
```

## Available Scripts

```bash
# Development
npm start          # Start frontend development server
npm run dev:server # Start API server in development mode

# Building
npm run build      # Build frontend for production

# Testing
npm test           # Run tests
npm run lint       # Run ESLint
npm run format     # Run Prettier

# Database
npm run migrate    # Run database migrations
```

## Environment Variables

See `.env.example` for required environment variables.

Key variables include:
- `PORT`: API server port (default: 4000)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT signing
- `FRONTEND_URL`: Frontend URL for CORS

## Security

- JWT-based authentication
- MFA support
- Rate limiting
- CORS configuration
- SSH key management
- Input validation
- Path traversal prevention

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE for details
