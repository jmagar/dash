# Initialize script-level configuration
$script:LogConfig = $null

function Initialize-Logging {
    [CmdletBinding()]
    param()
    
    try {
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            # If configuration is not initialized, use temporary logging
            $script:LogConfig = @{
                LogDirectory = Join-Path $env:TEMP "code-analysis-logs"
                ConsoleLogging = $true
                SessionId = [guid]::NewGuid().ToString()
            }
        }
        else {
            # Set logging configuration from module config
            $script:LogConfig = @{
                LogDirectory = $config.settings.Output.LogDirectory
                ConsoleLogging = $config.settings.ConsoleLogging
                SessionId = $config.settings.SessionId
            }
        }
        
        # Ensure log directory exists
        if (-not (Test-Path $script:LogConfig.LogDirectory)) {
            New-Item -ItemType Directory -Path $script:LogConfig.LogDirectory -Force | Out-Null
        }
        
        return $true
    }
    catch {
        Write-Error "Failed to initialize logging: $_"
        return $false
    }
}

function Write-StructuredLog {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,
        [Parameter()]
        [ValidateSet('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')]
        [string]$Level = 'INFO',
        [Parameter()]
        [hashtable]$Properties = @{},
        [Parameter()]
        [string]$Source = $MyInvocation.PSCommandPath
    )
    
    try {
        # Initialize logging if not already initialized
        if (-not $script:LogConfig) {
            Initialize-Logging | Out-Null
        }
        
        # Format log entry
        $logEntry = @{
            Timestamp = (Get-Date).ToString('o')
            Level = $Level
            Source = $Source
            Message = $Message
            Properties = $Properties | ConvertTo-Json -Compress
            SessionId = $script:LogConfig.SessionId
        }
        
        # Format log line
        $logLine = "$($logEntry.Timestamp) [$($logEntry.Level)] $($logEntry.Source) - $($logEntry.Message) - Properties: $($logEntry.Properties) - SessionId: $($logEntry.SessionId)"
        
        # Setup log paths
        $logPath = Join-Path $script:LogConfig.LogDirectory "code-analysis.log"
        $errorLogPath = Join-Path $script:LogConfig.LogDirectory "error.log"
        $tempLogPath = Join-Path $script:LogConfig.LogDirectory "temp.log"
        
        # Write to temporary file first
        Set-Content -Path $tempLogPath -Value $logLine
        
        # Write to appropriate log file based on level
        if ($Level -in 'ERROR', 'FATAL') {
            # For errors, write to both main log and error log
            Move-Item -Path $tempLogPath -Destination $logPath -Force -Append
            Set-Content -Path $tempLogPath -Value $logLine
            Move-Item -Path $tempLogPath -Destination $errorLogPath -Force -Append
        } else {
            # For non-errors, write only to main log
            Move-Item -Path $tempLogPath -Destination $logPath -Force -Append
        }
        
        # Write to console if enabled
        if ($script:LogConfig.ConsoleLogging) {
            $color = switch ($Level) {
                'DEBUG' { 'Gray' }
                'INFO'  { 'White' }
                'WARN'  { 'Yellow' }
                'ERROR' { 'Red' }
                'FATAL' { 'DarkRed' }
                default { 'White' }
            }
            
            Write-Host "[$($logEntry.Level)] $($logEntry.Message)" -ForegroundColor $color
            if ($Properties.Count -gt 0) {
                Write-Host "Properties: $($logEntry.Properties)" -ForegroundColor $color
            }
        }
        
        # Return success result
        return @{
            status = @{
                success = $true
                errors = @()
            }
            metadata = @{
                timestamp = $logEntry.Timestamp
                level = $Level
                source = $Source
            }
        }
    }
    catch {
        $criticalError = $_.Exception.Message
        $errorTime = Get-Date -Format "o"
        
        # Attempt to write to error log with multiple fallback locations
        $errorLocations = @(
            $(if ($script:LogConfig.LogDirectory) { Join-Path $script:LogConfig.LogDirectory "error.log" }),
            $(Join-Path $PSScriptRoot "../Output/logs/error.log"),
            $(Join-Path $env:TEMP "code-analysis-error.log")
        )
        
        $errorEntry = "$errorTime [FATAL] Logging.ps1 - Failed to write log: $criticalError"
        $errorWritten = $false
        
        foreach ($location in $errorLocations) {
            try {
                if (-not $location) { continue }
                $errorDir = Split-Path $location -Parent
                if (-not (Test-Path $errorDir)) {
                    New-Item -ItemType Directory -Path $errorDir -Force | Out-Null
                }
                Add-Content -Path $location -Value $errorEntry
                $errorWritten = $true
                break
            }
            catch {
                continue
            }
        }
        
        if (-not $errorWritten) {
            Write-Error "Critical failure in logging system. Error: $criticalError. Failed to write to any error log location."
        }
        
        # Return error result
        return @{
            status = @{
                success = $false
                errors = @($criticalError)
            }
            metadata = @{
                timestamp = $errorTime
                level = "FATAL"
                source = "Logging.ps1"
            }
        }
    }
}

function Reset-Logging {
    [CmdletBinding()]
    param()
    
    try {
        Write-Verbose "Resetting logging configuration"
        
        # Clear logging configuration
        $script:LogConfig = $null
        
        return $true
    }
    catch {
        Write-Error "Failed to reset logging: $_"
        return $false
    }
}

Export-ModuleMember -Function Write-StructuredLog, Initialize-Logging, Reset-Logging
