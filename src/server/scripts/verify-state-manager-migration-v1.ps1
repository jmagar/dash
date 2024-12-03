# Script to verify StateManager migration
param (
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/state-manager-migration-config.ps1"

# Initialize verification results
$results = @{
    TotalFiles = 0
    FilesWithIssues = 0
    ImportIssues = 0
    UsageIssues = 0
    StateOperationIssues = 0
    SubscriptionIssues = 0
    PersistenceIssues = 0
    ValidationIssues = 0
    IssuesList = @()
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Test-StateManagerImports {
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

function Test-StateManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    # Check for non-singleton instantiation patterns
    foreach ($pattern in $usagePatterns) {
        if ($content -match $pattern) {
            $issues += "Direct instantiation of StateManager found in $filePath"
            $results.UsageIssues++
        }
    }
    
    # Check state operation patterns
    foreach ($pattern in $stateOperationPatterns) {
        if ($content -match $pattern -and $content -notmatch "StateManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton state operation pattern found in $filePath"
            $results.StateOperationIssues++
        }
    }
    
    # Check subscription patterns
    foreach ($pattern in $stateSubscriptionPatterns) {
        if ($content -match $pattern -and $content -notmatch "StateManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton subscription pattern found in $filePath"
            $results.SubscriptionIssues++
        }
    }
    
    # Check persistence patterns
    foreach ($pattern in $statePersistencePatterns) {
        if ($content -match $pattern -and $content -notmatch "StateManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton persistence pattern found in $filePath"
            $results.PersistenceIssues++
        }
    }
    
    # Check validation patterns
    foreach ($pattern in $stateValidationPatterns) {
        if ($content -match $pattern -and $content -notmatch "StateManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton validation pattern found in $filePath"
            $results.ValidationIssues++
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
        
        # Skip files that don't contain StateManager
        if ($content -match "StateManager") {
            Write-VerboseMessage "Checking $filePath"
            
            $importIssues = Test-StateManagerImports -content $content -filePath $filePath
            $usageIssues = Test-StateManagerUsage -content $content -filePath $filePath
            
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
Write-Host "State operation issues: $($results.StateOperationIssues)"
Write-Host "Subscription issues: $($results.SubscriptionIssues)"
Write-Host "Persistence issues: $($results.PersistenceIssues)"
Write-Host "Validation issues: $($results.ValidationIssues)"

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
