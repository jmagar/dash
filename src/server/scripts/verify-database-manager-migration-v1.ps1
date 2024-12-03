# Script to verify DatabaseManager migration
param (
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/database-manager-migration-config.ps1"

# Initialize verification results
$results = @{
    TotalFiles = 0
    FilesWithIssues = 0
    ImportIssues = 0
    UsageIssues = 0
    ConnectionIssues = 0
    QueryIssues = 0
    TransactionIssues = 0
    PoolIssues = 0
    MigrationIssues = 0
    ErrorHandlingIssues = 0
    IssuesList = @()
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Test-DatabaseManagerImports {
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

function Test-DatabaseManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    # Check for non-singleton instantiation patterns
    foreach ($pattern in $usagePatterns) {
        if ($content -match $pattern) {
            $issues += "Direct instantiation of DatabaseManager found in $filePath"
            $results.UsageIssues++
        }
    }
    
    # Check connection management patterns
    foreach ($pattern in $connectionPatterns) {
        if ($content -match $pattern -and $content -notmatch "DatabaseManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton connection management pattern found in $filePath"
            $results.ConnectionIssues++
        }
    }
    
    # Check query execution patterns
    foreach ($pattern in $queryPatterns) {
        if ($content -match $pattern -and $content -notmatch "DatabaseManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton query execution pattern found in $filePath"
            $results.QueryIssues++
        }
    }
    
    # Check transaction management patterns
    foreach ($pattern in $transactionPatterns) {
        if ($content -match $pattern -and $content -notmatch "DatabaseManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton transaction management pattern found in $filePath"
            $results.TransactionIssues++
        }
    }
    
    # Check pool management patterns
    foreach ($pattern in $poolPatterns) {
        if ($content -match $pattern -and $content -notmatch "DatabaseManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton pool management pattern found in $filePath"
            $results.PoolIssues++
        }
    }
    
    # Check migration patterns
    foreach ($pattern in $migrationPatterns) {
        if ($content -match $pattern -and $content -notmatch "DatabaseManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton migration pattern found in $filePath"
            $results.MigrationIssues++
        }
    }
    
    # Check error handling patterns
    foreach ($pattern in $errorPatterns) {
        if ($content -match $pattern -and $content -notmatch "DatabaseManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton error handling pattern found in $filePath"
            $results.ErrorHandlingIssues++
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
        
        # Skip files with no DatabaseManager or database-related code
        if ($content -match "DatabaseManager" -or (Should-MigrateDatabaseSpecific $content)) {
            Write-VerboseMessage "Checking $filePath"
            
            $importIssues = Test-DatabaseManagerImports -content $content -filePath $filePath
            $usageIssues = Test-DatabaseManagerUsage -content $content -filePath $filePath
            
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

function Process-Directory {
    param (
        [string]$dirPath
    )
    
    if (Should-ExcludeDirectory $dirPath) {
        Write-VerboseMessage "Skipping excluded directory: $dirPath"
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
Write-Host "Starting DatabaseManager migration verification..."

$srcPath = Resolve-Path "$PSScriptRoot/.."
Process-Directory -dirPath $srcPath

# Print results
Write-Host "`nVerification Summary:"
Write-Host "Total files: $($results.TotalFiles)"
Write-Host "Files with issues: $($results.FilesWithIssues)"
Write-Host "Import issues: $($results.ImportIssues)"
Write-Host "Usage issues: $($results.UsageIssues)"
Write-Host "Connection issues: $($results.ConnectionIssues)"
Write-Host "Query issues: $($results.QueryIssues)"
Write-Host "Transaction issues: $($results.TransactionIssues)"
Write-Host "Pool issues: $($results.PoolIssues)"
Write-Host "Migration issues: $($results.MigrationIssues)"
Write-Host "Error handling issues: $($results.ErrorHandlingIssues)"

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
