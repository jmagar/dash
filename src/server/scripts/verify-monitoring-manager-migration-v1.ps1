# Script to verify MonitoringManager migration
param (
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/monitoring-manager-migration-config.ps1"

# Initialize verification results
$results = @{
    TotalFiles = 0
    FilesWithIssues = 0
    ImportIssues = 0
    UsageIssues = 0
    MetricIssues = 0
    EventIssues = 0
    PerformanceIssues = 0
    ErrorTrackingIssues = 0
    ResourceIssues = 0
    AlertIssues = 0
    DashboardIssues = 0
    ConfigIssues = 0
    IssuesList = @()
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Test-ImportPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $importPatterns) {
        if ($content -match $pattern) {
            $issues += "Non-compliant import pattern found in $filePath"
            $results.ImportIssues++
        }
    }
    
    return $issues
}

function Test-UsagePatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $usagePatterns) {
        if ($content -match $pattern) {
            $issues += "Non-singleton instantiation pattern found in $filePath"
            $results.UsageIssues++
        }
    }
    
    return $issues
}

function Test-MetricPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $metricPatterns) {
        if ($content -match $pattern -and $content -notmatch "MonitoringManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton metric pattern found in $filePath"
            $results.MetricIssues++
        }
    }
    
    return $issues
}

function Test-EventPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $eventPatterns) {
        if ($content -match $pattern -and $content -notmatch "MonitoringManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton event pattern found in $filePath"
            $results.EventIssues++
        }
    }
    
    return $issues
}

function Test-PerformancePatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $performancePatterns) {
        if ($content -match $pattern -and $content -notmatch "MonitoringManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton performance pattern found in $filePath"
            $results.PerformanceIssues++
        }
    }
    
    return $issues
}

function Test-ErrorTrackingPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $errorTrackingPatterns) {
        if ($content -match $pattern -and $content -notmatch "MonitoringManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton error tracking pattern found in $filePath"
            $results.ErrorTrackingIssues++
        }
    }
    
    return $issues
}

function Test-ResourcePatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $resourcePatterns) {
        if ($content -match $pattern -and $content -notmatch "MonitoringManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton resource pattern found in $filePath"
            $results.ResourceIssues++
        }
    }
    
    return $issues
}

function Test-AlertPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $alertPatterns) {
        if ($content -match $pattern -and $content -notmatch "MonitoringManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton alert pattern found in $filePath"
            $results.AlertIssues++
        }
    }
    
    return $issues
}

function Test-DashboardPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $dashboardPatterns) {
        if ($content -match $pattern -and $content -notmatch "MonitoringManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton dashboard pattern found in $filePath"
            $results.DashboardIssues++
        }
    }
    
    return $issues
}

function Test-ConfigPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $configPatterns) {
        if ($content -match $pattern -and $content -notmatch "MonitoringManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton config pattern found in $filePath"
            $results.ConfigIssues++
        }
    }
    
    return $issues
}

function Process-File {
    param (
        [string]$filePath
    )
    
    try {
        $content = Get-Content -Path $filePath -Raw
        
        # Skip files that don't contain MonitoringManager
        if ($content -match "MonitoringManager") {
            Write-VerboseMessage "Checking $filePath"
            
            $importIssues = Test-ImportPatterns -content $content -filePath $filePath
            $usageIssues = Test-UsagePatterns -content $content -filePath $filePath
            $metricIssues = Test-MetricPatterns -content $content -filePath $filePath
            $eventIssues = Test-EventPatterns -content $content -filePath $filePath
            $performanceIssues = Test-PerformancePatterns -content $content -filePath $filePath
            $errorTrackingIssues = Test-ErrorTrackingPatterns -content $content -filePath $filePath
            $resourceIssues = Test-ResourcePatterns -content $content -filePath $filePath
            $alertIssues = Test-AlertPatterns -content $content -filePath $filePath
            $dashboardIssues = Test-DashboardPatterns -content $content -filePath $filePath
            $configIssues = Test-ConfigPatterns -content $content -filePath $filePath
            
            $results.TotalFiles++
            
            $allIssues = @() + $importIssues + $usageIssues + $metricIssues + 
                        $eventIssues + $performanceIssues + $errorTrackingIssues + 
                        $resourceIssues + $alertIssues + $dashboardIssues + $configIssues
            
            if ($allIssues.Count -gt 0) {
                $results.FilesWithIssues++
                $results.IssuesList += @{
                    File = $filePath
                    Issues = $allIssues
                }
            }
        }
    }
    catch {
        $results.IssuesList += @{
            File = $filePath
            Issues = @("Error processing file: $_")
        }
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

# Start processing from script directory
Process-Directory -dirPath (Split-Path $PSScriptRoot -Parent)

# Print results
Write-Host "`nVerification Summary:"
Write-Host "Total files: $($results.TotalFiles)"
Write-Host "Files with issues: $($results.FilesWithIssues)"
Write-Host "Import issues: $($results.ImportIssues)"
Write-Host "Usage issues: $($results.UsageIssues)"
Write-Host "Metric issues: $($results.MetricIssues)"
Write-Host "Event issues: $($results.EventIssues)"
Write-Host "Performance issues: $($results.PerformanceIssues)"
Write-Host "Error tracking issues: $($results.ErrorTrackingIssues)"
Write-Host "Resource issues: $($results.ResourceIssues)"
Write-Host "Alert issues: $($results.AlertIssues)"
Write-Host "Dashboard issues: $($results.DashboardIssues)"
Write-Host "Config issues: $($results.ConfigIssues)"

if ($results.FilesWithIssues -gt 0) {
    Write-Host "`nIssues:"
    $results.IssuesList | ForEach-Object {
        Write-Host "`nFile: $($_.File)"
        Write-Host "Issues:"
        $_.Issues | ForEach-Object {
            Write-Host "  - $_"
        }
    }
}

Write-Host "`nVerification completed!"

# Return non-zero exit code if issues were found
exit $results.FilesWithIssues
