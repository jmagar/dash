# SSH Remote Management

A modern web interface for managing remote servers through SSH, with support for file management, package management, and Docker containers.

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

### Frontend

- React with TypeScript
- Material-UI Components
- WebSocket for Real-time Updates
- Custom React Hooks
- Context API for State Management

### Backend

- Node.js/Express
- PostgreSQL Database
- Redis Caching
- WebSocket Server
- SSH2 for Remote Access

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/yourusername/shh.git
cd shh
```

1. Install dependencies:

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

1. Set up environment variables:

```bash
# Frontend
cp .env.example .env

# Backend
cd backend
cp .env.example .env
cd ..
```

1. Start the services:

```bash
docker compose up
```

The application will be available at:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## Development

Start the development server:

```bash
# Frontend
npm start

# Backend
cd backend
npm run dev
```

## Project Structure

```plaintext
.
├── src/                    # Frontend source code
│   ├── api/               # API client functions
│   ├── components/        # React components
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── styles/           # Global styles
│   └── types/            # TypeScript definitions
├── backend/              # Backend source code
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── db/              # Database setup
│   └── cache/           # Redis cache setup
├── db/                  # Database migrations
└── docker-compose.yml   # Docker services config
```

## Available Scripts

Frontend:

```bash
npm start          # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run format     # Run Prettier
```

Backend:

```bash
npm run dev        # Start development server
npm start          # Start production server
npm run migrate    # Run database migrations
```

## Environment Variables

See `.env.example` and `backend/.env.example` for required environment variables.

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
