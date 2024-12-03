# Script to verify WebSocketManager migration
param (
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/websocket-manager-migration-config.ps1"

# Initialize verification results
$results = @{
    TotalFiles = 0
    FilesWithIssues = 0
    ImportIssues = 0
    UsageIssues = 0
    ConnectionIssues = 0
    MessageIssues = 0
    EventIssues = 0
    RoomIssues = 0
    SecurityIssues = 0
    IssuesList = @()
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Test-WebSocketManagerImports {
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

function Test-WebSocketManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    # Check for non-singleton instantiation patterns
    foreach ($pattern in $usagePatterns) {
        if ($content -match $pattern) {
            $issues += "Direct instantiation of WebSocketManager found in $filePath"
            $results.UsageIssues++
        }
    }
    
    # Check connection patterns
    foreach ($pattern in $connectionPatterns) {
        if ($content -match $pattern -and $content -notmatch "WebSocketManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton connection pattern found in $filePath"
            $results.ConnectionIssues++
        }
    }
    
    # Check message patterns
    foreach ($pattern in $messagePatterns) {
        if ($content -match $pattern -and $content -notmatch "WebSocketManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton message pattern found in $filePath"
            $results.MessageIssues++
        }
    }
    
    # Check event patterns
    foreach ($pattern in $eventPatterns) {
        if ($content -match $pattern -and $content -notmatch "WebSocketManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton event pattern found in $filePath"
            $results.EventIssues++
        }
    }
    
    # Check room patterns
    foreach ($pattern in $roomPatterns) {
        if ($content -match $pattern -and $content -notmatch "WebSocketManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton room pattern found in $filePath"
            $results.RoomIssues++
        }
    }
    
    # Check security patterns
    foreach ($pattern in $securityPatterns) {
        if ($content -match $pattern -and $content -notmatch "WebSocketManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton security pattern found in $filePath"
            $results.SecurityIssues++
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
        
        # Skip files that don't contain WebSocketManager
        if ($content -match "WebSocketManager") {
            Write-VerboseMessage "Checking $filePath"
            
            $importIssues = Test-WebSocketManagerImports -content $content -filePath $filePath
            $usageIssues = Test-WebSocketManagerUsage -content $content -filePath $filePath
            
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
Write-Host "Connection issues: $($results.ConnectionIssues)"
Write-Host "Message issues: $($results.MessageIssues)"
Write-Host "Event issues: $($results.EventIssues)"
Write-Host "Room issues: $($results.RoomIssues)"
Write-Host "Security issues: $($results.SecurityIssues)"

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
