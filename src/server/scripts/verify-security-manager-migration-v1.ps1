# Script to verify SecurityManager migration
param (
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/security-manager-migration-config.ps1"

# Initialize verification results
$results = @{
    TotalFiles = 0
    FilesWithIssues = 0
    ImportIssues = 0
    UsageIssues = 0
    AuthIssues = 0
    AuthzIssues = 0
    SessionIssues = 0
    EncryptionIssues = 0
    AuditIssues = 0
    IssuesList = @()
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Test-SecurityManagerImports {
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

function Test-SecurityManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    # Check for non-singleton instantiation patterns
    foreach ($pattern in $usagePatterns) {
        if ($content -match $pattern) {
            $issues += "Direct instantiation of SecurityManager found in $filePath"
            $results.UsageIssues++
        }
    }
    
    # Check authentication patterns
    foreach ($pattern in $authPatterns) {
        if ($content -match $pattern -and $content -notmatch "SecurityManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton authentication pattern found in $filePath"
            $results.AuthIssues++
        }
    }
    
    # Check authorization patterns
    foreach ($pattern in $authzPatterns) {
        if ($content -match $pattern -and $content -notmatch "SecurityManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton authorization pattern found in $filePath"
            $results.AuthzIssues++
        }
    }
    
    # Check session patterns
    foreach ($pattern in $sessionPatterns) {
        if ($content -match $pattern -and $content -notmatch "SecurityManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton session pattern found in $filePath"
            $results.SessionIssues++
        }
    }
    
    # Check encryption patterns
    foreach ($pattern in $encryptionPatterns) {
        if ($content -match $pattern -and $content -notmatch "SecurityManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton encryption pattern found in $filePath"
            $results.EncryptionIssues++
        }
    }
    
    # Check audit patterns
    foreach ($pattern in $auditPatterns) {
        if ($content -match $pattern -and $content -notmatch "SecurityManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton audit pattern found in $filePath"
            $results.AuditIssues++
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
        
        # Skip files that don't contain SecurityManager
        if ($content -match "SecurityManager") {
            Write-VerboseMessage "Checking $filePath"
            
            $importIssues = Test-SecurityManagerImports -content $content -filePath $filePath
            $usageIssues = Test-SecurityManagerUsage -content $content -filePath $filePath
            
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
Write-Host "Authentication issues: $($results.AuthIssues)"
Write-Host "Authorization issues: $($results.AuthzIssues)"
Write-Host "Session issues: $($results.SessionIssues)"
Write-Host "Encryption issues: $($results.EncryptionIssues)"
Write-Host "Audit issues: $($results.AuditIssues)"

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
