using namespace System.Management.Automation.Language

# Import required modules
. $PSScriptRoot/Configuration.ps1

$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

function New-LogResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Source,
        [Parameter(Mandatory)]
        [string]$Level,
        [Parameter(Mandatory)]
        [string]$Message,
        [Parameter()]
        [hashtable]$Properties = @{}
    )
    
    return @{
        metadata = @{
            source = $Source
            level = $Level.ToUpper()
            timestamp = Get-Date -Format "o"
            version = "1.0"
            session_id = $script:Config.SessionId
        }
        message = @{
            text = $Message
            properties = $Properties
        }
        context = @{
            script_name = $MyInvocation.ScriptName
            function_name = $MyInvocation.MyCommand.Name
            line_number = $MyInvocation.ScriptLineNumber
            caller = $MyInvocation.PSCommandPath
        }
        status = @{
            success = $true
            warnings = @()
            errors = @()
        }
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
        $startTime = Get-Date
        $result = New-LogResult -Source $Source -Level $Level -Message $Message -Properties $Properties
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Ensure log directory exists and is accessible
        $logDir = $script:Config.LogDirectory
        if (-not $logDir) {
            $logDir = Join-Path $PWD "logs"
        }
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        
        # Setup log paths
        $logPath = Join-Path $logDir "code-analysis.log"
        $errorLogPath = Join-Path $logDir "error.log"
        $tempLogPath = Join-Path $logDir "temp.log"
        
        # Format log entry
        $logEntry = @{
            Timestamp = $result.metadata.timestamp
            Level = $result.metadata.level
            Source = $result.metadata.source
            Message = $result.message.text
            Properties = $result.message.properties | ConvertTo-Json -Compress
            Context = $result.context | ConvertTo-Json -Compress
            SessionId = $result.metadata.session_id
        }
        
        # Format log line
        $logLine = "$($logEntry.Timestamp) [$($logEntry.Level)] $($logEntry.Source) - $($logEntry.Message) - Properties: $($logEntry.Properties) - Context: $($logEntry.Context) - SessionId: $($logEntry.SessionId)"
        
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
        if ($script:Config.ConsoleLogging) {
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
        
        # Update result with timing information
        $result.metadata.end_time = (Get-Date).ToString("o")
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            log_size_bytes = (Get-Item $logPath).Length
            error_log_size_bytes = if (Test-Path $errorLogPath) { (Get-Item $errorLogPath).Length } else { 0 }
        }
        
        return $result
    }
    catch {
        $criticalError = $_.Exception.Message
        $errorTime = Get-Date -Format "o"
        
        # Attempt to write to error log with multiple fallback locations
        $errorLocations = @(
            $(if ($script:Config.LogDirectory) { Join-Path $script:Config.LogDirectory "error.log" }),
            $(Join-Path $PWD "error.log"),
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
        
        if ($result) {
            $result.status.success = $false
            $result.status.errors += $criticalError
            $result.metadata.end_time = $errorTime
            return $result
        }
        
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

function Get-LogEntries {
    [CmdletBinding()]
    param(
        [Parameter()]
        [DateTime]$StartTime,
        [Parameter()]
        [DateTime]$EndTime,
        [Parameter()]
        [string]$Level,
        [Parameter()]
        [string]$Source,
        [Parameter()]
        [string]$MessagePattern
    )
    
    try {
        $result = New-LogResult -Source "LogQuery" -Level "INFO" -Message "Querying log entries"
        $logPath = Join-Path $script:Config.LogDirectory "code-analysis.log"
        
        if (-not (Test-Path $logPath)) {
            throw "Log file not found: $logPath"
        }
        
        $logs = Get-Content $logPath | ForEach-Object {
            if ($_ -match '(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z) \[(DEBUG|INFO|WARN|ERROR|FATAL)\] (.*?) - (.*?) - Properties: (.*?) - Context: (.*?) - SessionId: (.*)') {
                @{
                    Timestamp = [DateTime]$matches[1]
                    Level = $matches[2]
                    Source = $matches[3]
                    Message = $matches[4]
                    Properties = $matches[5]
                    Context = $matches[6]
                    SessionId = $matches[7]
                }
            }
        }
        
        # Apply filters
        if ($StartTime) {
            $logs = $logs | Where-Object { $_.Timestamp -ge $StartTime }
        }
        if ($EndTime) {
            $logs = $logs | Where-Object { $_.Timestamp -le $EndTime }
        }
        if ($Level) {
            $logs = $logs | Where-Object { $_.Level -eq $Level }
        }
        if ($Source) {
            $logs = $logs | Where-Object { $_.Source -like "*$Source*" }
        }
        if ($MessagePattern) {
            $logs = $logs | Where-Object { $_.Message -match $MessagePattern }
        }
        
        $result.message.properties.entries_found = $logs.Count
        return $logs
    }
    catch {
        Write-StructuredLog -Message "Failed to query log entries: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return @()
    }
}

function Clear-LogFiles {
    [CmdletBinding()]
    param(
        [Parameter()]
        [int]$RetentionDays = 30
    )
    
    try {
        $startTime = Get-Date
        $result = New-LogResult -Source "LogMaintenance" -Level "INFO" -Message "Clearing old log files"
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Setup log paths
        $logDir = $script:Config.LogDirectory
        if (-not $logDir) {
            $logDir = Join-Path $PWD "logs"
        }
        
        $mainLogPath = Join-Path $logDir "code-analysis.log"
        $errorLogPath = Join-Path $logDir "error.log"
        $tempLogPath = Join-Path $logDir "temp.log"
        $backupDir = Join-Path $logDir "archive"
        
        # Ensure backup directory exists
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }
        
        $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
        $filesProcessed = 0
        $bytesRemoved = 0
        
        # Process main log file
        if (Test-Path $mainLogPath) {
            $logContent = Get-Content $mainLogPath | Where-Object {
                if ($_ -match '(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})') {
                    return ([DateTime]::Parse($matches[1]) -gt $cutoffDate)
                }
                return $true
            }
            
            # Create backup before modifying
            $backupFile = Join-Path $backupDir "code-analysis_$(Get-Date -Format 'yyyyMMdd').log"
            Copy-Item $mainLogPath $backupFile
            
            # Write filtered content to temp file and move
            Set-Content -Path $tempLogPath -Value $logContent
            $bytesRemoved += (Get-Item $mainLogPath).Length - (Get-Item $tempLogPath).Length
            Move-Item -Path $tempLogPath -Destination $mainLogPath -Force
            $filesProcessed++
        }
        
        # Process error log file
        if (Test-Path $errorLogPath) {
            $errorContent = Get-Content $errorLogPath | Where-Object {
                if ($_ -match '(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})') {
                    return ([DateTime]::Parse($matches[1]) -gt $cutoffDate)
                }
                return $true
            }
            
            # Create backup before modifying
            $backupFile = Join-Path $backupDir "error_$(Get-Date -Format 'yyyyMMdd').log"
            Copy-Item $errorLogPath $backupFile
            
            # Write filtered content to temp file and move
            Set-Content -Path $tempLogPath -Value $errorContent
            $bytesRemoved += (Get-Item $errorLogPath).Length - (Get-Item $tempLogPath).Length
            Move-Item -Path $tempLogPath -Destination $errorLogPath -Force
            $filesProcessed++
        }
        
        # Clean up old backup files
        Get-ChildItem $backupDir -Filter "*.log" | Where-Object {
            $_.LastWriteTime -lt $cutoffDate
        } | ForEach-Object {
            $bytesRemoved += $_.Length
            $filesProcessed++
            Remove-Item $_.FullName -Force
        }
        
        # Update result
        $result.metadata.end_time = (Get-Date).ToString("o")
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            files_processed = $filesProcessed
            bytes_removed = $bytesRemoved
        }
        
        Write-StructuredLog -Message "Log files cleaned" -Level INFO -Properties @{
            retention_days = $RetentionDays
            files_processed = $filesProcessed
            bytes_removed = $bytesRemoved
            duration_ms = $result.metrics.duration_ms
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to clear log files: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        $result.metadata.end_time = (Get-Date).ToString("o")
        return $result
    }
}

Export-ModuleMember -Function Write-StructuredLog, Get-LogEntries, Clear-LogFiles
