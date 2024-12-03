# Script to verify ConfigManager migration
param (
    [switch]$Verbose,
    [switch]$Force
)

# Import configuration
. "$PSScriptRoot/config-manager-migration-config.ps1"

# Initialize results
$issues = @()
$filesScanned = 0
$configIssues = 0

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Add-Issue {
    param (
        [string]$filePath,
        [string]$issue,
        [string]$line,
        [int]$lineNumber
    )
    
    $issues.Add(@{
        File = $filePath
        Issue = $issue
        Line = $line
        LineNumber = $lineNumber
    })
}

function Check-ImportStatements {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        # Check for non-standard ConfigManager imports
        foreach ($pattern in $importPatterns) {
            if ($line -match $pattern -and $line -notmatch "import ConfigManager from") {
                Add-Issue -filePath $filePath -issue "Non-standard ConfigManager import" -line $line.Trim() -lineNumber ($i + 1)
            }
        }
        
        # Check for incorrect relative paths
        if ($line -match "import.*ConfigManager.*from") {
            $correctPath = Get-ConfigManagerImportPath -currentFile $filePath -configManagerPath $configManagerPath
            if ($line -notmatch [regex]::Escape($correctPath)) {
                Add-Issue -filePath $filePath -issue "Incorrect import path" -line $line.Trim() -lineNumber ($i + 1)
            }
        }
    }
}

function Check-ConfigManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        # Check for direct instantiation
        foreach ($pattern in $usagePatterns) {
            if ($line -match $pattern -and $line -notmatch "ConfigManager\.getInstance\(\)") {
                Add-Issue -filePath $filePath -issue "Direct ConfigManager instantiation" -line $line.Trim() -lineNumber ($i + 1)
            }
        }
        
        # Check for direct process.env usage
        if ($line -match "process\.env\.") {
            Add-Issue -filePath $filePath -issue "Direct process.env usage" -line $line.Trim() -lineNumber ($i + 1)
            $script:configIssues++
        }
        
        # Check for dotenv.config() calls
        if ($line -match "dotenv\.config\s*\(") {
            Add-Issue -filePath $filePath -issue "Direct dotenv.config() call" -line $line.Trim() -lineNumber ($i + 1)
            $script:configIssues++
        }
        
        # Check for require('config') usage
        if ($line -match "require\s*\(['\"]config['\"]\)") {
            Add-Issue -filePath $filePath -issue "Direct config require() call" -line $line.Trim() -lineNumber ($i + 1)
            $script:configIssues++
        }
        
        # Check for non-singleton config operations
        if (Should-MigrateConfig $line) {
            if ($line -match "loadConfig\s*\(" -and $line -notmatch "ConfigManager\.getInstance\(\)\.loadConfig") {
                Add-Issue -filePath $filePath -issue "Non-singleton config loading" -line $line.Trim() -lineNumber ($i + 1)
            }
            if ($line -match "reloadConfig\s*\(" -and $line -notmatch "ConfigManager\.getInstance\(\)\.reloadConfig") {
                Add-Issue -filePath $filePath -issue "Non-singleton config reload" -line $line.Trim() -lineNumber ($i + 1)
            }
            if ($line -match "getConfig\s*\(" -and $line -notmatch "ConfigManager\.getInstance\(\)\.getConfig") {
                Add-Issue -filePath $filePath -issue "Non-singleton config retrieval" -line $line.Trim() -lineNumber ($i + 1)
            }
            if ($line -match "setConfig\s*\(" -and $line -notmatch "ConfigManager\.getInstance\(\)\.setConfig") {
                Add-Issue -filePath $filePath -issue "Non-singleton config setting" -line $line.Trim() -lineNumber ($i + 1)
            }
            if ($line -match "watchConfig\s*\(" -and $line -notmatch "ConfigManager\.getInstance\(\)\.watchConfig") {
                Add-Issue -filePath $filePath -issue "Non-singleton config watching" -line $line.Trim() -lineNumber ($i + 1)
            }
        }
    }
}

function Process-File {
    param (
        [string]$filePath
    )
    
    try {
        $content = Get-Content -Path $filePath -Raw
        
        # Skip files with no ConfigManager or config-related code
        if ($content -match "ConfigManager" -or (Should-MigrateConfig $content)) {
            Write-VerboseMessage "Checking $filePath"
            
            Check-ImportStatements -content $content -filePath $filePath
            Check-ConfigManagerUsage -content $content -filePath $filePath
        }
    }
    catch {
        Add-Issue -filePath $filePath -issue "Error processing file: $_" -line "" -lineNumber 0
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
            $script:filesScanned++
            Process-File -filePath $_.FullName
        }
    }
    
    # Recursively process subdirectories
    Get-ChildItem -Path $dirPath -Directory | ForEach-Object {
        Process-Directory -dirPath $_.FullName
    }
}

# Main execution
Write-Host "Starting ConfigManager migration verification..."

$srcPath = Resolve-Path "$PSScriptRoot/.."
Process-Directory -dirPath $srcPath

# Print results
Write-Host "`nVerification Summary:"
Write-Host "Files scanned: $filesScanned"
Write-Host "Issues found: $($issues.Count)"
Write-Host "Config-related issues: $configIssues"

if ($issues.Count -gt 0) {
    Write-Host "`nIssues:"
    $issues | ForEach-Object {
        Write-Host "`nFile: $($_.File)"
        Write-Host "Line: $($_.LineNumber)"
        Write-Host "Issue: $($_.Issue)"
        if ($_.Line) {
            Write-Host "Code: $($_.Line)"
        }
    }
}

Write-Host "`nVerification completed!"

# Return non-zero exit code if issues were found
exit $issues.Count
