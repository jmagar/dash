# [Previous content remains the same until the Test-EnvironmentVariables function]

# Function to validate environment variables
function Test-EnvironmentVariables {
    Write-Host "Validating environment variables..."
    Save-State "validating_env"
    
    # Basic patterns (same as bash script)
    $basicPatterns = @{
        'DB_USER' = @{
            Pattern = '^[a-zA-Z0-9_-]+$'
            Description = 'Must contain only alphanumeric characters, underscores, and hyphens'
        }
        'DB_NAME' = @{
            Pattern = '^[a-zA-Z0-9_-]+$'
            Description = 'Must contain only alphanumeric characters, underscores, and hyphens'
        }
        'PORT' = @{
            Pattern = '^[0-9]+$'
            Description = 'Must be a valid port number'
        }
        'HOST' = @{
            Pattern = '^[a-zA-Z0-9._-]+$'
            Description = 'Must be a valid hostname'
        }
    }
    
    # Enhanced security patterns
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
    }
    
    # Combine all patterns
    $patterns = $basicPatterns + $securityPatterns
    
    foreach ($var in $patterns.Keys) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ($value) {
            if (-not ($value -match $patterns[$var].Pattern)) {
                throw "Invalid environment variable: $var - $($patterns[$var].Description)"
            }
        }
    }
    
    # Check for sensitive information in non-secure variables
    $sensitiveWords = @(
        'password',
        'secret',
        'key',
        'token'
    )
    
    Get-ChildItem env: | ForEach-Object {
        $name = $_.Name
        $value = $_.Value
        
        # Skip known secure variables
        if ($patterns.ContainsKey($name)) {
            return
        }
        
        # Use -imatch for case-insensitive comparison
        foreach ($word in $sensitiveWords) {
            if ($name -imatch [regex]::Escape($word)) {
                Write-Warning "Potential security risk: Environment variable '$name' may contain sensitive information"
            }
        }
    }
    
    Write-Host "Environment variables validated" -ForegroundColor Green
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

# [Previous content remains the same until the end]

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
