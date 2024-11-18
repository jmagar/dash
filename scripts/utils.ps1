# PowerShell utility functions for SHH Dashboard deployment

# Function to format and write a step header
function Write-StepHeader {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

# Function to format and write a substep
function Write-SubStep {
    param([string]$Message)
    Write-Host "    -> $Message" -ForegroundColor Gray
}

# Function to format and write a success message
function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

# Function to format and write an error message
function Write-CustomError {
    param(
        [string]$Message,
        [string]$Details = ""
    )
    Write-Host "❌ ERROR: $Message" -ForegroundColor Red
    if ($Details) {
        Write-Host "   $Details" -ForegroundColor Red
    }
}

# Function to format and write a warning message
function Write-CustomWarning {
    param([string]$Message)
    Write-Host "⚠ WARNING: $Message" -ForegroundColor Yellow
}

# Function to check if running as administrator
function Test-Administrator {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($user)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to ensure running as administrator
function Assert-Administrator {
    if (-not (Test-Administrator)) {
        throw "This script must be run as Administrator"
    }
}

# Function to validate path exists
function Assert-PathExists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "Path does not exist: $Path"
    }
}

# Function to validate environment variable exists
function Assert-EnvironmentVariable {
    param([string]$Name)
    if (-not (Get-Item env:$Name -ErrorAction SilentlyContinue)) {
        throw "Required environment variable not set: $Name"
    }
}

# Function to get available memory in GB
function Get-AvailableMemoryGB {
    $os = Get-CimInstance Win32_OperatingSystem
    return [math]::Round($os.FreePhysicalMemory / 1MB, 2)
}

# Function to get available disk space in GB
function Get-AvailableDiskSpaceGB {
    param([string]$Path)
    $drive = Split-Path -Qualifier $Path
    $space = (Get-PSDrive $drive.TrimEnd(":")).Free
    return [math]::Round($space / 1GB, 2)
}

# Function to test port availability
function Test-PortAvailable {
    param(
        [int]$Port,
        [string]$Protocol = "TCP"
    )
    $listener = $null
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

# Function to wait for service health
function Wait-ServiceHealth {
    param(
        [string]$ServiceName,
        [int]$TimeoutSeconds = 60,
        [int]$IntervalSeconds = 2
    )
    
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        $status = Invoke-Expression "$DOCKER_COMPOSE ps --format json $ServiceName" | ConvertFrom-Json
        if ($status.Health -eq "healthy") {
            return $true
        }
        Start-Sleep -Seconds $IntervalSeconds
        $elapsed += $IntervalSeconds
    }
    return $false
}

# Export all functions
Export-ModuleMember -Function *
