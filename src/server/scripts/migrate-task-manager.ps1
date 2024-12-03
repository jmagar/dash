# Migration script for TaskManager
param(
    [switch]$DryRun,
    [switch]$Verbose
)

# Import the configuration
. "$PSScriptRoot\task-manager-migration-config.ps1"

# Function to test if a path should be excluded
function Test-ExcludePath {
    param (
        [string]$Path
    )
    
    foreach ($excluded in $excludedDirs) {
        if ($Path -match [regex]::Escape($excluded)) {
            if ($Verbose) {
                Write-Host "Excluding path: $Path (matched $excluded)" -ForegroundColor Gray
            }
            return $true
        }
    }
    return $false
}

# Function to update a single file
function Update-TaskManagerFile {
    param (
        [string]$FilePath,
        [bool]$DryRun,
        [bool]$Verbose
    )

    if (Test-ExcludePath -Path $FilePath) {
        return
    }

    if ($Verbose) {
        Write-Host "`nAnalyzing file: $FilePath" -ForegroundColor Cyan
    }

    $content = Get-Content $FilePath -Raw
    $findings = @{
        CustomScheduling = @()
        ErrorHandling = @()
        Timeouts = @()
        Monitoring = @()
        TaskManager = @()
    }

    # Check for existing TaskManager usage
    foreach ($pattern in $importPatterns + $usagePatterns) {
        if ($content -match $pattern) {
            $findings.TaskManager += $pattern
        }
    }

    # Check for custom scheduling implementations
    foreach ($pattern in $customSchedulingPatterns) {
        if ($content -match $pattern) {
            $findings.CustomScheduling += $pattern
        }
    }

    # Check for custom error handling
    foreach ($pattern in $errorHandlingPatterns) {
        if ($content -match $pattern) {
            $findings.ErrorHandling += $pattern
        }
    }

    # Check for custom timeout implementations
    foreach ($pattern in $timeoutPatterns) {
        if ($content -match $pattern) {
            $findings.Timeouts += $pattern
        }
    }

    # Check for custom monitoring
    foreach ($pattern in $monitoringPatterns) {
        if ($content -match $pattern) {
            $findings.Monitoring += $pattern
        }
    }

    # Report findings
    $hasFindings = $false
    foreach ($category in $findings.Keys) {
        if ($findings[$category].Count -gt 0) {
            $hasFindings = $true
            $color = if ($category -eq 'TaskManager') { 'Green' } else { 'Yellow' }
            Write-Host "`n[$category]" -ForegroundColor $color
            foreach ($pattern in $findings[$category]) {
                Write-Host "  - Found pattern: $pattern"
            }
        }
    }

    if ($hasFindings) {
        Write-Host "`nRecommendation for $FilePath:" -ForegroundColor Cyan
        if ($findings.TaskManager.Count -gt 0) {
            Write-Host "  Already using TaskManager - Review for complete migration" -ForegroundColor Green
        } else {
            Write-Host "  Migrate to centralized TaskManager implementation" -ForegroundColor Yellow
        }
        
        # Add to summary report
        $script:totalFiles++
        if ($findings.TaskManager.Count -eq 0) {
            $script:filesToMigrate++
        }
        foreach ($category in $findings.Keys) {
            if ($findings[$category].Count -gt 0) {
                $script:patternStats[$category]++
            }
        }
    }
}

# Initialize statistics
$script:totalFiles = 0
$script:filesToMigrate = 0
$script:patternStats = @{
    CustomScheduling = 0
    ErrorHandling = 0
    Timeouts = 0
    Monitoring = 0
    TaskManager = 0
}

Write-Host "`nStarting TaskManager migration..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "Running in DRY RUN mode - no files will be modified`n" -ForegroundColor Yellow
}

# Get all TypeScript files recursively
$allFiles = Get-ChildItem -Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" | 
    Where-Object { -not (Test-ExcludePath -Path $_.FullName) }

Write-Host "Found $($allFiles.Count) files to check`n" -ForegroundColor Cyan

# Update each file
foreach ($file in $allFiles) {
    Update-TaskManagerFile -FilePath $file.FullName -DryRun $DryRun -Verbose $Verbose
}

Write-Host "`n=== Migration Analysis Summary ===" -ForegroundColor Cyan
Write-Host "Total files analyzed: $totalFiles"
Write-Host "Files requiring migration: $filesToMigrate"
Write-Host "`nPattern Statistics:"
foreach ($category in $patternStats.Keys) {
    $color = if ($category -eq 'TaskManager') { 'Green' } else { 'Yellow' }
    Write-Host "  $category`: $($patternStats[$category]) files" -ForegroundColor $color
}

Write-Host "`nMigration complete!" -ForegroundColor Green
