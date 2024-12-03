# Script to migrate MonitoringManager usage to new patterns
param (
    [switch]$DryRun,
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/monitoring-manager-migration-config.ps1"

# Initialize counters
$stats = @{
    FilesProcessed = 0
    FilesModified = 0
    ImportPatternsMigrated = 0
    UsagePatternsMigrated = 0
    MetricPatternsMigrated = 0
    EventPatternsMigrated = 0
    PerformancePatternsMigrated = 0
    ErrorTrackingPatternsMigrated = 0
    ResourcePatternsMigrated = 0
    AlertPatternsMigrated = 0
    DashboardPatternsMigrated = 0
    ConfigPatternsMigrated = 0
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Backup-File {
    param (
        [string]$FilePath
    )
    
    $backupPath = Join-Path $backupDir (Split-Path $FilePath -Leaf)
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    Copy-Item $FilePath $backupPath -Force
    Write-VerboseMessage "Created backup: $backupPath"
}

function Update-ImportStatements {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $importPatterns) {
        $updatedContent = $updatedContent -replace $pattern, "import { MonitoringManager } from '@utils/monitoring'"
    }
    
    return $updatedContent
}

function Update-UsagePatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $usagePatterns) {
        $updatedContent = $updatedContent -replace $pattern, "MonitoringManager.getInstance()"
    }
    
    return $updatedContent
}

function Update-MetricPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $metricPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.MetricPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "MonitoringManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-EventPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $eventPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.EventPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "MonitoringManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-PerformancePatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $performancePatterns) {
        if ($updatedContent -match $pattern) {
            $stats.PerformancePatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "MonitoringManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-ErrorTrackingPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $errorTrackingPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.ErrorTrackingPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "MonitoringManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-ResourcePatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $resourcePatterns) {
        if ($updatedContent -match $pattern) {
            $stats.ResourcePatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "MonitoringManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-AlertPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $alertPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.AlertPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "MonitoringManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-DashboardPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $dashboardPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.DashboardPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "MonitoringManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-ConfigPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $configPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.ConfigPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "MonitoringManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Process-File {
    param (
        [string]$filePath
    )
    
    try {
        $content = Get-Content -Path $filePath -Raw
        
        # Skip files with no MonitoringManager
        if ($content -notmatch "MonitoringManager") {
            return
        }
        
        Write-VerboseMessage "Processing $filePath"
        $stats.FilesProcessed++
        
        $originalContent = $content
        $updatedContent = $content
        
        # Apply all updates
        $updatedContent = Update-ImportStatements -content $updatedContent
        $updatedContent = Update-UsagePatterns -content $updatedContent
        $updatedContent = Update-MetricPatterns -content $updatedContent
        $updatedContent = Update-EventPatterns -content $updatedContent
        $updatedContent = Update-PerformancePatterns -content $updatedContent
        $updatedContent = Update-ErrorTrackingPatterns -content $updatedContent
        $updatedContent = Update-ResourcePatterns -content $updatedContent
        $updatedContent = Update-AlertPatterns -content $updatedContent
        $updatedContent = Update-DashboardPatterns -content $updatedContent
        $updatedContent = Update-ConfigPatterns -content $updatedContent
        
        # Only proceed if content was modified
        if ($updatedContent -ne $originalContent) {
            $stats.FilesModified++
            
            if (-not $DryRun) {
                Backup-File -FilePath $filePath
                Set-Content -Path $filePath -Value $updatedContent
                Write-VerboseMessage "Updated $filePath"
            }
        }
    }
    catch {
        Write-Error "Error processing $filePath : $_"
    }
}

function Process-Directory {
    param (
        [string]$dirPath
    )
    
    # Skip excluded directories
    if ((Split-Path -Leaf $dirPath) -in $excludedDirs) {
        return
    }
    
    # Process all matching files in current directory
    foreach ($pattern in $includePatterns) {
        Get-ChildItem -Path $dirPath -Filter $pattern -File | ForEach-Object {
            Process-File -filePath $_.FullName
        }
    }
    
    # Recursively process subdirectories
    Get-ChildItem -Path $dirPath -Directory | ForEach-Object {
        Process-Directory -dirPath $_.FullName
    }
}

# Main execution
Write-Host "Starting MonitoringManager migration..."
if ($DryRun) {
    Write-Host "Running in dry-run mode - no files will be modified"
}

$srcPath = Resolve-Path "$PSScriptRoot/.."
Process-Directory -dirPath $srcPath

# Print results
Write-Host "`nMigration Summary:"
Write-Host "Files processed: $($stats.FilesProcessed)"
Write-Host "Files modified: $($stats.FilesModified)"
Write-Host "Import patterns migrated: $($stats.ImportPatternsMigrated)"
Write-Host "Usage patterns migrated: $($stats.UsagePatternsMigrated)"
Write-Host "Metric patterns migrated: $($stats.MetricPatternsMigrated)"
Write-Host "Event patterns migrated: $($stats.EventPatternsMigrated)"
Write-Host "Performance patterns migrated: $($stats.PerformancePatternsMigrated)"
Write-Host "Error tracking patterns migrated: $($stats.ErrorTrackingPatternsMigrated)"
Write-Host "Resource patterns migrated: $($stats.ResourcePatternsMigrated)"
Write-Host "Alert patterns migrated: $($stats.AlertPatternsMigrated)"
Write-Host "Dashboard patterns migrated: $($stats.DashboardPatternsMigrated)"
Write-Host "Config patterns migrated: $($stats.ConfigPatternsMigrated)"

Write-Host "`nMigration completed!"

# Return non-zero exit code if no files were modified
exit $(if ($stats.FilesModified -eq 0) { 1 } else { 0 })
