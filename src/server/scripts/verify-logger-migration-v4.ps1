# Logger Migration Verification Script v4
# Verifies that logger imports and usage patterns are correct after migration

param(
    [switch]$Verbose,
    [string]$SingleFile,
    [switch]$ForceCheck
)

# Import shared configuration and functions
. "$PSScriptRoot/logger-migration-config.ps1"

$stats = @{
    TotalFiles = 0
    Processed = 0
    Correct = 0
    Issues = 0
    Skipped = 0
}

# Track files with issues for summary
$filesWithIssues = @()

function Write-VerboseLog {
    param([string]$Message, [string]$Color = "White")
    if ($Verbose) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Test-LoggerUsage {
    param([string]$content, [string]$filePath)

    $issues = @()
    
    # Check for old logger imports
    if ($content -match "import.*logger.*from.*['""]$($config.OldImportPattern)['""]") {
        $issues += "Found old logger import pattern"
    }

    # Check for direct logger usage without LoggingManager
    if ($content -match "logger\.(info|error|warn|debug)\(") {
        $issues += "Found direct logger usage without LoggingManager"
    }

    # Check for proper LoggingManager usage
    $hasLoggerUsage = $content -match "$($config.ManagerName)\.getInstance\(\)\.(info|error|warn|debug)\("
    $hasLoggerImport = $content -match "import.*$($config.ManagerName).*from"
    
    if ($hasLoggerUsage -and -not $hasLoggerImport) {
        $issues += "Missing LoggingManager import"
    }

    # Calculate relative path for import verification
    if ($hasLoggerImport) {
        $fileDir = Split-Path -Parent $filePath
        $expectedRelativePath = Get-RelativePath -from $fileDir -to $config.ManagerPath
        if (-not ($content -match [regex]::Escape($expectedRelativePath))) {
            $issues += "Incorrect LoggingManager import path (expected: $expectedRelativePath)"
        }
    }

    return $issues
}

function Get-RelativePath {
    param (
        [string]$from,
        [string]$to
    )
    
    $fromParts = $from.Replace("\", "/").Split("/")
    $toParts = $to.Replace("\", "/").Split("/")
    
    $commonPrefixLength = 0
    $minLength = [Math]::Min($fromParts.Length, $toParts.Length)
    
    for ($i = 0; $i -lt $minLength; $i++) {
        if ($fromParts[$i] -eq $toParts[$i]) {
            $commonPrefixLength++
        } else {
            break
        }
    }
    
    $backCount = $fromParts.Length - $commonPrefixLength
    $relativePath = "../" * $backCount + ($toParts[$commonPrefixLength..($toParts.Length-1)] -join "/")
    
    return $relativePath
}

function Get-TypeScriptFiles {
    param (
        [string]$SingleFile
    )
    
    if ($SingleFile) {
        return Get-Item $SingleFile
    } else {
        return Get-ChildItem -Path $config.RootDir -Filter "*.ts" -Recurse | 
        Where-Object { 
            $path = $_.FullName
            -not ($config.ExcludeDirs | Where-Object { $path -match $_ })
        }
    }
}

# Get all TypeScript files
$files = Get-TypeScriptFiles -SingleFile $SingleFile
$stats.TotalFiles = $files.Count

Write-Host "Found $($stats.TotalFiles) TypeScript files to verify..."

foreach ($file in $files) {
    $stats.Processed++
    Write-VerboseLog "`nVerifying $($stats.Processed)/$($stats.TotalFiles): $($file.FullName)..." "Yellow"
    
    try {
        $content = Get-Content -Path $file.FullName -Raw
        
        # Skip files without any logger usage
        if (-not ($content -match "$($config.ManagerName)|logger\.")) {
            $stats.Skipped++
            Write-VerboseLog "Skipped - No logger usage found" "Gray"
            continue
        }
        
        $issues = Test-LoggerUsage -content $content -filePath $file.FullName
        
        if ($issues.Count -gt 0) {
            $stats.Issues++
            $filesWithIssues += @{
                File = $file.FullName
                Issues = $issues
            }
            Write-VerboseLog "Issues found in $($file.FullName):" "Red"
            foreach ($issue in $issues) {
                Write-VerboseLog "  - $issue" "Red"
            }
        } else {
            $stats.Correct++
            Write-VerboseLog "Verified successfully" "Green"
        }
    }
    catch {
        Write-Host "Error processing $($file.FullName): $_" -ForegroundColor Red
        $stats.Issues++
    }
}

# Print Summary
Write-Host "`n=== Verification Summary ===" -ForegroundColor Cyan
Write-Host "Total files processed: $($stats.TotalFiles)" -ForegroundColor White
Write-Host "Files with correct logger usage: $($stats.Correct)" -ForegroundColor Green
Write-Host "Files with issues: $($stats.Issues)" -ForegroundColor Red
Write-Host "Files skipped (no logger usage): $($stats.Skipped)" -ForegroundColor Gray

if ($filesWithIssues.Count -gt 0) {
    Write-Host "`n=== Files With Issues ===" -ForegroundColor Yellow
    foreach ($fileIssue in $filesWithIssues) {
        Write-Host "`nFile: $($fileIssue.File)" -ForegroundColor Yellow
        foreach ($issue in $fileIssue.Issues) {
            Write-Host "  - $issue" -ForegroundColor Red
        }
    }
    exit 1
} else {
    Write-Host "`nAll files verified successfully!" -ForegroundColor Green
    exit 0
}
