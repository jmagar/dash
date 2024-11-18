# Strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Script variables
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = (Get-Item $SCRIPT_DIR).Parent.FullName
$STATE_FILE = Join-Path $env:TEMP "shh_deploy_state_$(Get-Date -Format 'yyyyMMddHHmmss')"

# Environment variables with defaults
$env:NODE_ENV = if ($env:NODE_ENV) { $env:NODE_ENV } else { "production" }
$env:SHH_DATA_DIR = if ($env:SHH_DATA_DIR) { $env:SHH_DATA_DIR } else { "C:\ProgramData\shh" }
$env:PORT = if ($env:PORT) { $env:PORT } else { "3000" }
$env:HOST = if ($env:HOST) { $env:HOST } else { "0.0.0.0" }
$env:DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$env:REDIS_PORT = if ($env:REDIS_PORT) { $env:REDIS_PORT } else { "6379" }

# Docker compose command based on environment
$DOCKER_COMPOSE = if ($env:NODE_ENV -eq "development") {
    "docker compose -f docker-compose.yml -f docker-compose.dev.yml"
} else {
    "docker compose"
}

# Function to save deployment state with timestamp
function Save-State {
    param([string]$State)
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): $State" | Out-File -FilePath $STATE_FILE -Append
}

# Function to get deployment state
function Get-DeploymentState {
    if (Test-Path $STATE_FILE) {
        Get-Content $STATE_FILE | Select-Object -Last 1 | ForEach-Object { ($_ -split ": ")[1] }
    }
    else {
        "init"
    }
}

# Function to handle cleanup on error
function Cleanup-OnError {
    param([string]$ErrorMessage)
    
    Write-Error "Deployment failed: $ErrorMessage"
    Write-Warning "Running cleanup..."

    # Check if docker compose is available
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Warning "Docker not available, skipping cleanup"
        return
    }

    $currentState = Get-DeploymentState
    switch ($currentState) {
        "services_started" {
            Write-Host "Stopping services..."
            Invoke-Expression "$DOCKER_COMPOSE down" -ErrorAction SilentlyContinue
        }
        "images_built" {
            Write-Host "Removing built images..."
            Invoke-Expression "$DOCKER_COMPOSE down --rmi local --volumes --remove-orphans" -ErrorAction SilentlyContinue
        }
    }

    # Remove state file
    if (Test-Path $STATE_FILE) {
        Remove-Item $STATE_FILE -Force
    }
}

# Required environment variables
$REQUIRED_ENV_VARS = @(
    @{
        Name = "POSTGRES_USER"
        Description = "PostgreSQL database user"
        DefaultValue = "shh_user"
    },
    @{
        Name = "POSTGRES_PASSWORD"
        Description = "PostgreSQL database password"
    },
    @{
        Name = "POSTGRES_DB"
        Description = "PostgreSQL database name"
        DefaultValue = "shh"
    },
    @{
        Name = "REDIS_PASSWORD"
        Description = "Redis password"
    },
    @{
        Name = "JWT_SECRET"
        Description = "JWT secret key for authentication"
    },
    @{
        Name = "ADMIN_EMAIL"
        Description = "Initial admin user email"
        DefaultValue = "admin@localhost"
    },
    @{
        Name = "ADMIN_PASSWORD"
        Description = "Initial admin user password"
    },
    @{
        Name = "PROMETHEUS_PORT"
        Description = "Prometheus metrics port"
        DefaultValue = "9090"
    },
    @{
        Name = "SYSLOG_PORT"
        Description = "Syslog port for log collection"
        DefaultValue = "1514"
    }
)

# Function to validate environment variables
function Test-EnvironmentVariables {
    Write-Host "Validating environment variables..."
    Save-State "validating_env"
    
    # Set default values for optional variables
    foreach ($var in $REQUIRED_ENV_VARS) {
        if ($var.DefaultValue -and -not (Get-Item "env:$($var.Name)" -ErrorAction SilentlyContinue)) {
            [Environment]::SetEnvironmentVariable($var.Name, $var.DefaultValue)
            Write-Host "Using default value for $($var.Name): $($var.DefaultValue)"
        }
    }
    
    # Check required variables
    foreach ($var in $REQUIRED_ENV_VARS) {
        if (-not (Get-Item "env:$($var.Name)" -ErrorAction SilentlyContinue)) {
            throw "Required environment variable $($var.Name) is not set. Description: $($var.Description)"
        }
    }
    
    # Basic patterns
    $basicPatterns = @{
        'POSTGRES_USER' = @{
            Pattern = '^[a-zA-Z0-9_-]+$'
            Description = 'Must contain only alphanumeric characters, underscores, and hyphens'
        }
        'POSTGRES_DB' = @{
            Pattern = '^[a-zA-Z0-9_-]+$'
            Description = 'Must contain only alphanumeric characters, underscores, and hyphens'
        }
        'PORT' = @{
            Pattern = '^[0-9]+$'
            Description = 'Must be a valid port number'
        }
        'DB_PORT' = @{
            Pattern = '^[0-9]+$'
            Description = 'Must be a valid port number'
        }
        'REDIS_PORT' = @{
            Pattern = '^[0-9]+$'
            Description = 'Must be a valid port number'
        }
        'PROMETHEUS_PORT' = @{
            Pattern = '^[0-9]+$'
            Description = 'Must be a valid port number'
        }
        'SYSLOG_PORT' = @{
            Pattern = '^[0-9]+$'
            Description = 'Must be a valid port number'
        }
    }

    foreach ($var in $basicPatterns.Keys) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ($value -and -not ($value -match $basicPatterns[$var].Pattern)) {
            throw "$var format is invalid. $($basicPatterns[$var].Description)"
        }
    }

    # Security patterns
    $securityPatterns = @{
        'JWT_SECRET' = @{
            Pattern = '^.{32,}$'
            Description = 'Must be at least 32 characters long'
        }
        'POSTGRES_PASSWORD' = @{
            Pattern = '^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{12,}$'
            Description = 'Must be at least 12 characters with letters, numbers, and special characters'
        }
        'REDIS_PASSWORD' = @{
            Pattern = '^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{12,}$'
            Description = 'Must be at least 12 characters with letters, numbers, and special characters'
        }
        'ADMIN_PASSWORD' = @{
            Pattern = '^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{12,}$'
            Description = 'Must be at least 12 characters with letters, numbers, and special characters'
        }
    }

    foreach ($var in $securityPatterns.Keys) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ($value -and -not ($value -match $securityPatterns[$var].Pattern)) {
            throw "$var format is invalid. $($securityPatterns[$var].Description)"
        }
    }

    Write-Host "Environment variables validated"
}

# Function to run database migrations
function Invoke-DatabaseMigration {
    Write-Host "Running database migrations..."
    Save-State "running_migrations"
    
    # Run migrations using prisma
    try {
        Write-Host "Generating Prisma client..."
        npx prisma generate
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to generate Prisma client"
        }

        Write-Host "Running database migrations..."
        npx prisma migrate deploy
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to run database migrations"
        }
    }
    catch {
        throw "Database migration failed: $_"
    }
}

# Function to setup initial admin user
function Set-InitialAdminUser {
    Write-Host "Setting up initial admin user..."
    Save-State "setting_up_admin"
    
    try {
        $script = @"
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function createAdminUser() {
    const prisma = new PrismaClient();
    try {
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await prisma.user.upsert({
            where: { email: 'admin@localhost' },
            update: {},
            create: {
                email: 'admin@localhost',
                name: 'Admin',
                password: hashedPassword,
                role: 'ADMIN'
            }
        });
        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Failed to create admin user:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

createAdminUser();
"@
        $scriptPath = Join-Path $env:TEMP "create-admin.js"
        $script | Out-File -FilePath $scriptPath -Encoding UTF8
        
        node $scriptPath
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create admin user"
        }
        
        Remove-Item $scriptPath -Force
    }
    catch {
        throw "Failed to setup initial admin user: $_"
    }
}

# Function to verify network connectivity with improved checks
function Test-Network {
    Write-Host "Verifying network connectivity..."
    Save-State "checking_network"

    # Define required endpoints
    $endpoints = @(
        @{Uri = "hub.docker.com"; Port = 443; Description = "Docker Hub"},
        @{Uri = "registry.npmjs.org"; Port = 443; Description = "NPM Registry"},
        @{Uri = "github.com"; Port = 443; Description = "GitHub"}
    )

    # Test each endpoint with WebRequest (equivalent to curl)
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri "https://$($endpoint.Uri)" -Method Head -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ne 200) {
                throw "Cannot connect to $($endpoint.Description)"
            }
        }
        catch {
            throw "Cannot connect to $($endpoint.Description): $_"
        }
    }

    # Check if required ports are available
    $requiredPorts = @(
        @{Port = 3000; Service = "Web UI"},
        @{Port = 5432; Service = "PostgreSQL"},
        @{Port = 6379; Service = "Redis"},
        @{Port = 9090; Service = "Prometheus"}
    )

    foreach ($portInfo in $requiredPorts) {
        # Skip system-reserved ports
        if ($portInfo.Port -lt 1024 -and -not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
            throw "Administrator privileges required to use port $($portInfo.Port) for $($portInfo.Service)"
        }
        
        if (-not (Test-PortAvailable -Port $portInfo.Port)) {
            throw "Port conflict: Port $($portInfo.Port) is already in use (Required for: $($portInfo.Service))"
        }
    }

    Write-Host "Network connectivity verified" -ForegroundColor Green
}

# Function to check if a port is available
function Test-PortAvailable {
    param([int]$Port)
    
    $ipAddress = [System.Net.IPAddress]::Loopback
    $tcpListener = New-Object System.Net.Sockets.TcpListener($ipAddress, $Port)
    
    try {
        $tcpListener.Start()
        $tcpListener.Stop()
        return $true
    }
    catch {
        return $false
    }
}

# Main deployment function
function Start-Deployment {
    Write-Host "Starting SHH Dashboard deployment ($env:NODE_ENV mode)" -ForegroundColor Cyan
    
    try {
        # Pre-deployment checks
        Write-Host "Running pre-deployment checks..."
        Test-EnvironmentVariables
        Test-Network
        
        # Create required directories
        Write-Host "Creating required directories..."
        Save-State "creating_directories"
        $dataDir = $env:SHH_DATA_DIR
        $directories = @(
            $dataDir,
            (Join-Path $dataDir "logs"),
            (Join-Path $dataDir "data"),
            (Join-Path $dataDir "config"),
            (Join-Path $dataDir "certs")
        )
        
        foreach ($dir in $directories) {
            if (-not (Test-Path $dir)) {
                New-Item -ItemType Directory -Force -Path $dir | Out-Null
                Write-Host "Created directory: $dir"
            }
        }

        # Set proper permissions
        $acl = Get-Acl $dataDir
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            "Users",
            "Modify",
            "ContainerInherit,ObjectInherit",
            "None",
            "Allow"
        )
        $acl.SetAccessRule($rule)
        Set-Acl $dataDir $acl
        Write-Host "Set permissions on data directory"

        # Pull Docker images
        Write-Host "Pulling Docker images..."
        Save-State "pulling_images"
        Invoke-Expression "$DOCKER_COMPOSE pull"
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to pull Docker images"
        }

        # Build Docker images
        Write-Host "Building Docker images..."
        Save-State "building_images"
        Invoke-Expression "$DOCKER_COMPOSE build --no-cache"
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to build Docker images"
        }
        Save-State "images_built"

        # Start services
        Write-Host "Starting services..."
        Save-State "starting_services"
        Invoke-Expression "$DOCKER_COMPOSE up -d"
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to start services"
        }
        Save-State "services_started"

        # Run database migrations
        Invoke-DatabaseMigration

        # Setup initial admin user
        Set-InitialAdminUser

        # Wait for services to be healthy
        Write-Host "Waiting for services to be healthy..."
        $maxAttempts = 30
        $attempt = 1
        $services = @("app", "postgres", "redis")
        
        while ($attempt -le $maxAttempts) {
            $allHealthy = $true
            foreach ($service in $services) {
                $status = Invoke-Expression "$DOCKER_COMPOSE ps --format json $service" | ConvertFrom-Json
                if (-not $status -or $status.Health -ne "healthy") {
                    $allHealthy = $false
                    break
                }
            }
            
            if ($allHealthy) {
                Write-Host "All services are healthy" -ForegroundColor Green
                break
            }
            
            Write-Host "Waiting for services to be healthy (Attempt $attempt/$maxAttempts)..."
            Start-Sleep -Seconds 2
            $attempt++
            
            if ($attempt -gt $maxAttempts) {
                throw "Services did not become healthy within the timeout period"
            }
        }

        # Check health endpoints
        Write-Host "Checking health endpoints..."
        $endpoints = @(
            "http://localhost:3000/health",
            "http://localhost:3000/api/health"
        )
        
        foreach ($endpoint in $endpoints) {
            try {
                $response = Invoke-WebRequest -Uri $endpoint -Method GET -UseBasicParsing
                if ($response.StatusCode -ne 200) {
                    throw "Health check failed for $endpoint: $($response.StatusCode)"
                }
                Write-Host "Health check passed for $endpoint" -ForegroundColor Green
            }
            catch {
                throw "Could not reach health endpoint $endpoint: $_"
            }
        }

        # Show deployment info
        Write-Host "`nDeployment Information" -ForegroundColor Cyan
        Write-Host "`nContainer Status:" -ForegroundColor Yellow
        Invoke-Expression "$DOCKER_COMPOSE ps"
        
        Write-Host "`nService URLs:" -ForegroundColor Yellow
        Write-Host "Web UI:      http://localhost:3000"
        Write-Host "API:         http://localhost:3000/api"
        
        Write-Host "`nLog Locations:" -ForegroundColor Yellow
        Write-Host "Application: $(Join-Path $env:SHH_DATA_DIR 'logs\app.log')"
        Write-Host "Containers:  Use 'docker compose logs -f [service]'"

        Write-Host "`nDeployment completed successfully" -ForegroundColor Green
    }
    catch {
        Cleanup-OnError $_.Exception.Message
        exit 1
    }
}

# Enhanced error handling for PowerShell
# Register handler for Ctrl+C
$null = Register-ObjectEvent -InputObject ([Console]) -EventName CancelKeyPress -Action {
    Write-Host "`nReceived interrupt signal"
    Cleanup-OnError "Deployment interrupted by user"
    exit 1
}

# Start deployment
try {
    Start-Deployment
}
catch {
    Cleanup-OnError $_.Exception.Message
    exit 1
}
finally {
    # Cleanup event handlers
    Get-EventSubscriber | Unregister-Event
}
