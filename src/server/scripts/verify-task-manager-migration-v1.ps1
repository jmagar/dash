# Script to verify TaskManager migration
param (
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/task-manager-migration-config.ps1"

# Initialize verification results
$results = @{
    TotalFiles = 0
    FilesWithIssues = 0
    ImportIssues = 0
    UsageIssues = 0
    TaskOperationIssues = 0
    SchedulingIssues = 0
    WorkerIssues = 0
    QueueIssues = 0
    TaskEventIssues = 0
    IssuesList = @()
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Test-TaskManagerImports {
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

function Test-TaskManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    # Check for non-singleton instantiation patterns
    foreach ($pattern in $usagePatterns) {
        if ($content -match $pattern) {
            $issues += "Direct instantiation of TaskManager found in $filePath"
            $results.UsageIssues++
        }
    }
    
    # Check task operation patterns
    foreach ($pattern in $taskOperationPatterns) {
        if ($content -match $pattern -and $content -notmatch "TaskManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton task operation pattern found in $filePath"
            $results.TaskOperationIssues++
        }
    }
    
    # Check scheduling patterns
    foreach ($pattern in $schedulingPatterns) {
        if ($content -match $pattern -and $content -notmatch "TaskManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton scheduling pattern found in $filePath"
            $results.SchedulingIssues++
        }
    }
    
    # Check worker patterns
    foreach ($pattern in $workerPatterns) {
        if ($content -match $pattern -and $content -notmatch "TaskManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton worker pattern found in $filePath"
            $results.WorkerIssues++
        }
    }
    
    # Check queue patterns
    foreach ($pattern in $queuePatterns) {
        if ($content -match $pattern -and $content -notmatch "TaskManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton queue pattern found in $filePath"
            $results.QueueIssues++
        }
    }
    
    # Check task event patterns
    foreach ($pattern in $taskEventPatterns) {
        if ($content -match $pattern -and $content -notmatch "TaskManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton task event pattern found in $filePath"
            $results.TaskEventIssues++
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
        
        # Skip files that don't contain TaskManager
        if ($content -match "TaskManager") {
            Write-VerboseMessage "Checking $filePath"
            
            $importIssues = Test-TaskManagerImports -content $content -filePath $filePath
            $usageIssues = Test-TaskManagerUsage -content $content -filePath $filePath
            
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
Write-Host "Task operation issues: $($results.TaskOperationIssues)"
Write-Host "Scheduling issues: $($results.SchedulingIssues)"
Write-Host "Worker issues: $($results.WorkerIssues)"
Write-Host "Queue issues: $($results.QueueIssues)"
Write-Host "Task event issues: $($results.TaskEventIssues)"

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
