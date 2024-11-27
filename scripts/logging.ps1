function Write-Log {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet('INFO','WARN','ERROR','DEBUG')]
        [string]$Level = 'INFO',
        
        [Parameter(Mandatory=$false)]
        [string]$LogFile = "$PSScriptRoot/../docs/analysis/analysis.log",
        
        [Parameter(Mandatory=$false)]
        [string]$ScriptSpecificLog
    )
    
    # Create log directories if they don't exist
    $logDirs = @($LogFile)
    if ($ScriptSpecificLog) { $logDirs += $ScriptSpecificLog }
    
    foreach ($log in $logDirs) {
        $logDir = Split-Path $log -Parent
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        
        # Implement log rotation
        if (Test-Path $log) {
            $logInfo = Get-Item $log
            # Rotate if file is larger than 10MB
            if ($logInfo.Length -gt 10MB) {
                $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
                $rotatedLog = "$($logInfo.DirectoryName)/$($logInfo.BaseName).$timestamp$($logInfo.Extension)"
                Move-Item $log $rotatedLog
                Write-Verbose "Rotated log file to: $rotatedLog"
            }
        }
    }

    # Format the log message
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $correlationId = if ($script:CorrelationId) { "[$script:CorrelationId]" } else { "" }
    $logMessage = "[$timestamp]$correlationId [$Level] $Message"
    
    # Write to console with appropriate color
    switch ($Level) {
        'ERROR' { Write-Host $logMessage -ForegroundColor Red }
        'WARN'  { Write-Host $logMessage -ForegroundColor Yellow }
        'INFO'  { Write-Host $logMessage -ForegroundColor White }
        'DEBUG' { Write-Host $logMessage -ForegroundColor Gray }
    }
    
    # Append to main log file
    Add-Content -Path $LogFile -Value $logMessage
    
    # If script-specific log is specified, write there too
    if ($ScriptSpecificLog) {
        Add-Content -Path $ScriptSpecificLog -Value $logMessage
    }
}

function Start-ScriptLogging {
    [CmdletBinding()]
    param(
        [string]$ScriptName,
        [string]$LogFile = "$PSScriptRoot/../docs/analysis/analysis.log",
        [switch]$UseScriptSpecificLog
    )
    
    # Generate correlation ID for tracking related log entries
    $script:CorrelationId = [guid]::NewGuid().ToString().Substring(0, 8)
    
    # Set up script-specific log if requested
    if ($UseScriptSpecificLog) {
        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $script:ScriptSpecificLog = "$PSScriptRoot/../docs/analysis/logs/$ScriptName-$timestamp.log"
    }
    
    Write-Log -Message "=== Starting script: $ScriptName ===" -Level INFO -LogFile $LogFile -ScriptSpecificLog $script:ScriptSpecificLog
    $script:LastError = $null
    
    # Set up error handling
    $ErrorActionPreference = 'Stop'
    
    # Create script-level variables
    $script:LogFile = $LogFile
}

function Stop-ScriptLogging {
    [CmdletBinding()]
    param(
        [string]$ScriptName,
        [string]$Status = 'Completed'
    )
    
    Write-Log -Message "=== $Status script: $ScriptName ===" -Level INFO -LogFile $script:LogFile -ScriptSpecificLog $script:ScriptSpecificLog
}

function Write-ErrorLog {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )
    
    $errorMessage = @"
Error Details:
- Message: $($ErrorRecord.Exception.Message)
- Script Line: $($ErrorRecord.InvocationInfo.ScriptLineNumber)
- Script Name: $($ErrorRecord.InvocationInfo.ScriptName)
- Position: $($ErrorRecord.InvocationInfo.PositionMessage)
- Stack Trace: $($ErrorRecord.ScriptStackTrace)
- Correlation ID: $script:CorrelationId
"@
    
    Write-Log -Message $errorMessage -Level ERROR -LogFile $script:LogFile -ScriptSpecificLog $script:ScriptSpecificLog
}
