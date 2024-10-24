# Docker Services Dashboard

A web-based dashboard for managing Docker services and containers. Built with Flask and modern JavaScript.

## Features

- Real-time container monitoring
- Terminal access to containers
- Service logs viewing
- Container updates
- Multi-host Docker management
- Proxy configuration integration
- Notification system

## Directory Structure

```
.
├── app.py                 # Main application entry point
├── server/               # Backend Python modules
│   ├── config.py         # Application configuration
│   ├── docker_service.py # Docker operations
│   ├── proxy_service.py  # Proxy configuration
│   └── routes/          # API endpoints
├── static/              # Frontend static files
│   ├── css/            # Stylesheets
│   └── js/             # JavaScript modules
├── templates/          # HTML templates
│   └── components/    # Reusable template components
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
docker-compose up -d
```

4. Access the dashboard at `http://localhost:5932`

## Environment Variables

- `COMPOSE_DIR`: Path to Docker Compose files directory
- `PROXY_DIR`: Path to proxy configuration directory
- `GOTIFY_URL`: Gotify server URL (optional)
- `GOTIFY_TOKEN`: Gotify API token (optional)

## Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run development server:
```bash
python app.py
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
