# SHH: SSH and Docker Management Application

## Overview

SHH is a comprehensive remote management application designed to provide seamless SSH and Docker management across multiple hosts.

## Features

- 🖥️ Multi-Host Management
- 🔒 Secure SSH Connections
- 🐳 Docker Resource Tracking
- 📂 File Explorer
- 📦 Package Management
- 🖲️ Remote Command Execution
- 👤 User Authentication
- 🌓 Dark/Light Mode Support

## Technology Stack

### Frontend

- React (TypeScript)
- Material-UI
- Socket.IO Client
- Axios

### Backend

- Node.js
- Express
- Socket.IO
- PostgreSQL
- Redis

## Prerequisites

- Node.js (v16+)
- npm (v8+)
- PostgreSQL
- Redis

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/shh.git
cd shh
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Backend Configuration
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/shh_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_SOCKET_URL=http://localhost:3001
```

### 4. Database Setup

```bash
# Create PostgreSQL database
createdb shh_db

# Run database migrations
npm run db:migrate
```

### 5. Start Development Servers

```bash
# Start backend server
npm run backend

# Start frontend development server
npm run dev
```

## Project Structure

```
shh/
├── backend/             # Backend server
├── src/
│   ├── api/             # API service layers
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── db/                  # Database migrations
└── docker/              # Docker-related configurations
```

## Authentication

- Default Admin Credentials
  - Username: admin
  - Password: admin123

## Security Features

- JWT-based authentication
- Multi-factor authentication
- Role-based access control
- Encrypted connections
- Comprehensive audit logging

## Performance Optimization

- Redis caching
- Socket.IO real-time updates
- Efficient database queries
- Lazy loading

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/shh](https://github.com/yourusername/shh)
