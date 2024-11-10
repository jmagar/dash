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

1. Install dependencies:

```bash
npm install
```

1. Set up environment variables:

```bash
cp .env.example .env
```

1. Start the development environment:

### Using Docker

```bash
docker compose up
```

### Local Development

```bash
# Start both frontend and backend in development mode
npm run dev

# Or start them separately:
npm run dev:client  # Frontend
npm run dev:server  # Backend
```

The application will be available at `http://localhost:4000`

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
npm run dev          # Start both frontend and backend in development mode
npm run dev:client   # Start frontend development server
npm run dev:server   # Start backend development server

# Production
npm run build        # Build frontend for production
npm start            # Start production server

# Testing and Linting
npm test            # Run frontend tests
npm run test:server # Run backend tests
npm run lint        # Run ESLint
npm run format      # Run Prettier

# Database
npm run migrate     # Run database migrations
```

## Environment Variables

Key variables in `.env`:

```bash
# Application
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:4000

# API Configuration
REACT_APP_API_URL=http://localhost:4000/api
REACT_APP_WS_URL=ws://localhost:4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=shh

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=30m
```

See `.env.example` for all available options.

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
1. Create your feature branch
1. Commit your changes
1. Push to the branch
1. Create a Pull Request

## License

MIT License - see LICENSE for details
