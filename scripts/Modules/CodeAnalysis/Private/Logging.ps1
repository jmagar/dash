using namespace System.IO
using namespace System.Collections.Concurrent

# Import configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/metrics.json" | ConvertFrom-Json

# Set up module-specific logging directory
$script:LogRoot = Join-Path $PSScriptRoot "../logs"
if (-not (Test-Path $script:LogRoot)) {
    New-Item -ItemType Directory -Path $script:LogRoot -Force | Out-Null
}

function Write-StructuredLog {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,
        [hashtable]$Properties,
        [ValidateSet('DEBUG', 'INFO', 'WARN', 'ERROR')]
        [string]$Level = 'INFO'
    )
    
    $logEntry = @{
        timestamp = Get-Date -Format "o"
        level = $Level
        message = $Message
        properties = $Properties
        correlationId = $script:CorrelationId
        scriptName = $MyInvocation.ScriptName
        lineNumber = $MyInvocation.ScriptLineNumber
    }
    
    $logJson = $logEntry | ConvertTo-Json -Compress
    
    # Check if rotation needed
    if (Test-Path $script:LogFile) {
        $logInfo = Get-Item $script:LogFile
        if ($logInfo.Length -gt [int]($script:Config.logging.maxFileSize -replace 'MB$','') * 1MB) {
            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
            $rotatedLog = Join-Path $logInfo.Directory "$($logInfo.BaseName).$timestamp$($logInfo.Extension)"
            Move-Item $script:LogFile $rotatedLog
            
            if ($script:Config.logging.compressionEnabled) {
                Compress-Archive -Path $rotatedLog -DestinationPath "$rotatedLog.zip"
                Remove-Item $rotatedLog
            }
            
            # Cleanup old logs
            $cutoffDate = (Get-Date).AddDays(-$script:Config.logging.retentionDays)
            Get-ChildItem $logInfo.Directory -Filter "$($logInfo.BaseName).*" |
                Where-Object { $_.LastWriteTime -lt $cutoffDate } |
                Remove-Item -Force
        }
    }
    
    Add-Content -Path $script:LogFile -Value $logJson
    
    # Write to console with appropriate color
    $color = switch ($Level) {
        'ERROR' { 'Red' }
        'WARN'  { 'Yellow' }
        'INFO'  { 'White' }
        'DEBUG' { 'Gray' }
    }
    Write-Host $Message -ForegroundColor $color
}

function Start-ScriptLogging {
    [CmdletBinding()]
    param(
        [string]$ScriptName,
        [string]$LogDirectory = $script:LogRoot
    )
    
    # Create log directory if it doesn't exist
    if (-not (Test-Path $LogDirectory)) {
        New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    }
    
    # Generate correlation ID
    $script:CorrelationId = [guid]::NewGuid().ToString().Substring(0, 8)
    
    # Set up log file path
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $script:LogFile = Join-Path $LogDirectory "$ScriptName-$timestamp.log"
    
    Write-StructuredLog -Message "=== Starting script: $ScriptName ===" -Level INFO -Properties @{
        correlationId = $script:CorrelationId
        timestamp = $timestamp
        moduleVersion = $MyInvocation.MyCommand.Module.Version
        psVersion = $PSVersionTable.PSVersion
    }
    
    # Set up error handling
    $ErrorActionPreference = 'Stop'
}

function Stop-ScriptLogging {
    [CmdletBinding()]
    param(
        [string]$ScriptName,
        [string]$Status = 'Completed'
    )
    
    Write-StructuredLog -Message "=== $Status script: $ScriptName ===" -Level INFO -Properties @{
        correlationId = $script:CorrelationId
        duration = ((Get-Date) - (Get-Item $script:LogFile).CreationTime).TotalSeconds
    }
}

function Write-ErrorLog {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )
    
    $errorDetails = @{
        message = $ErrorRecord.Exception.Message
        scriptName = $ErrorRecord.InvocationInfo.ScriptName
        lineNumber = $ErrorRecord.InvocationInfo.ScriptLineNumber
        position = $ErrorRecord.InvocationInfo.PositionMessage
        stackTrace = $ErrorRecord.ScriptStackTrace
        correlationId = $script:CorrelationId
    }
    
    Write-StructuredLog -Message "Error occurred" -Level ERROR -Properties $errorDetails
}

Export-ModuleMember -Function Write-StructuredLog, Start-ScriptLogging, Stop-ScriptLogging, Write-ErrorLog
