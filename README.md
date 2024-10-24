# Docker Services Dashboard

A web-based dashboard for managing Docker services and containers across multiple hosts. Built with Flask, WebSocket, and modern JavaScript.

## Features

- Real-time container monitoring with WebSocket updates
- Interactive terminal access to containers
- Live service logs streaming
- Container status and metrics tracking
- Multi-host Docker management via SSH
- Proxy configuration management
- Notification system integration
- Secure remote execution

## Directory Structure

```
.
├── app.py                  # Main Flask application
├── wsgi.py                # WSGI entry point with gevent integration
├── gunicorn.conf.py       # Gunicorn configuration
├── server/                # Backend Python modules
│   ├── __init__.py       # Service initialization
│   ├── ssh_service.py    # SSH-based Docker operations
│   ├── proxy_service.py  # Proxy configuration management
│   ├── metrics_service.py # Container metrics collection
│   ├── websocket_service.py # WebSocket handling
│   └── notification_service.py # Notification system
├── static/               # Frontend static files
│   ├── css/             # Stylesheets
│   │   └── styles.css   # Main stylesheet
│   └── js/              # JavaScript modules
│       ├── app.js       # Main application logic
│       ├── loader.js    # Module loader
│       └── modules/     # Feature modules
│           ├── containers.js   # Container management
│           ├── terminal.js     # Terminal handling
│           ├── websocket.js    # WebSocket client
│           └── servers.js      # Server management
├── templates/           # HTML templates
│   ├── index.html      # Main dashboard template
│   └── components/     # Reusable components
├── config/             # Configuration files
│   └── servers.json    # Server configurations
└── docker-compose.yml  # Docker configuration
```

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/docker-services-dashboard.git
cd docker-services-dashboard
```

2. Create and configure `.env` file:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Build and start the services:
```bash
docker compose up -d
```

4. Access the dashboard at `http://localhost:5932`

## Environment Variables

- `COMPOSE_DIR`: Path to Docker Compose files directory (default: /mnt/user/compose)
- `PROXY_DIR`: Path to proxy configuration directory (default: /mnt/user/appdata/swag/nginx/proxy-confs)
- `GOTIFY_URL`: Gotify server URL for notifications (optional)
- `GOTIFY_TOKEN`: Gotify API token for notifications (optional)

## Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run development server:
```bash
python wsgi.py
```

## Architecture

- **Backend**: Flask application with gevent-based WebSocket support
- **Frontend**: Vanilla JavaScript with modular design
- **Communication**:
  - REST API for standard operations
  - WebSocket for real-time updates and terminal access
  - SSH for secure remote Docker management

## Security

- SSH-based remote execution instead of direct Docker socket access
- Support for both password and key-based authentication
- Secure WebSocket communication
- No direct exposure of Docker daemon

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
