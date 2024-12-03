# Script to verify MetricsManager migration
param (
    [switch]$Verbose,
    [switch]$Force
)

# Import configuration
. "$PSScriptRoot/metrics-manager-migration-config.ps1"

# Initialize verification results
$results = @{
    TotalFiles = 0
    FilesWithIssues = 0
    ImportIssues = 0
    UsageIssues = 0
    MetricOperationIssues = 0
    PrometheusIssues = 0
    ConfigurationIssues = 0
    IssuesList = @()
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Test-MetricsManagerImports {
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

function Test-MetricsManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    # Check for non-singleton instantiation patterns
    foreach ($pattern in $usagePatterns) {
        if ($content -match $pattern) {
            $issues += "Direct instantiation of MetricsManager found in $filePath"
            $results.UsageIssues++
        }
    }
    
    # Check metric operation patterns
    foreach ($pattern in $metricPatterns) {
        if ($content -match $pattern -and $content -notmatch "MetricsManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton metric operation pattern found in $filePath"
            $results.MetricOperationIssues++
        }
    }
    
    # Check Prometheus-specific patterns
    foreach ($pattern in $prometheusPatterns) {
        if ($content -match $pattern -and $content -notmatch "MetricsManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton Prometheus pattern found in $filePath"
            $results.PrometheusIssues++
        }
    }
    
    # Check metric configuration patterns
    foreach ($pattern in $metricConfigPatterns) {
        if ($content -match $pattern -and $content -notmatch "MetricsManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton metric configuration pattern found in $filePath"
            $results.ConfigurationIssues++
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
        
        # Skip files that don't contain MetricsManager
        if ($content -match "MetricsManager") {
            Write-VerboseMessage "Checking $filePath"
            
            $importIssues = Test-MetricsManagerImports -content $content -filePath $filePath
            $usageIssues = Test-MetricsManagerUsage -content $content -filePath $filePath
            
            $results.TotalFiles++
            if ($importIssues.Count -gt 0 -or $usageIssues.Count -gt 0) {
                $results.FilesWithIssues++
                $results.IssuesList += @{
                    File = $filePath
                    Issues = ($importIssues + $usageIssues)
                }
            }
        }
    }
    catch {
        $results.IssuesList += @{
            File = $filePath
            Issues = "Error processing file: $_"
        }
    }
}

# Process all files in the project
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
Write-Host "Metric operation issues: $($results.MetricOperationIssues)"
Write-Host "Prometheus issues: $($results.PrometheusIssues)"
Write-Host "Configuration issues: $($results.ConfigurationIssues)"

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
