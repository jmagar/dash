# Enhanced Logger Migration Script v10
# This script handles all logger usage patterns and ensures proper imports

param(
    [switch]$DryRun,
    [switch]$Verbose,
    [string]$SingleFile,
    [switch]$BackupFiles,
    [switch]$SkipVerification,
    [switch]$ForceCheck
)

# Import shared configuration and functions
. "$PSScriptRoot/logger-migration-config.ps1"

$stats = @{
    TotalFiles = 0
    Processed = 0
    Modified = 0
    Errors = 0
    Skipped = 0
    NeedsMigration = 0
}

# Track modified files for summary
$modifiedFiles = @()

function Test-ShouldProcessFile {
    param([string]$content, [string]$filePath)
    
    if ($ForceCheck) { return $true }
    
    return ($content -match "import.*logger.*from" -or 
            $content -match "logger\.(info|error|warn|debug)\(" -or
            $content -match "$($config.ManagerName)\.getInstance\(\)")
}

function Backup-File {
    param([string]$FilePath)
    if ($BackupFiles) {
        $relativePath = $FilePath.Replace($PWD.Path + "\", "")
        $backupPath = Join-Path $config.BackupDir $relativePath
        $backupDir = Split-Path -Parent $backupPath
        
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }
        
        Copy-Item -Path $FilePath -Destination $backupPath -Force
        Write-VerboseLog "Created backup: $backupPath" "Gray"
    }
}

# Get all TypeScript files
$files = Get-TypeScriptFiles -SingleFile $SingleFile
$stats.TotalFiles = $files.Count

Write-Host "Found $($stats.TotalFiles) TypeScript files to process..."

foreach ($file in $files) {
    $stats.Processed++
    Write-Host "`nProcessing $($stats.Processed)/$($stats.TotalFiles): $($file.FullName)..." -ForegroundColor Yellow
    
    try {
        $content = Get-Content -Path $file.FullName -Raw
        
        # Check if file needs migration
        if (-not (Test-ShouldProcessFile -content $content -filePath $file.FullName)) {
            $stats.Skipped++
            Write-VerboseLog "Skipped - No logger usage found" "Gray"
            continue
        }
        
        $stats.NeedsMigration++
        
        # Backup file if needed
        Backup-File -FilePath $file.FullName
        
        # Perform the migration
        $newContent = $content
        $modified = $false
        $changes = @()

        # Step 1: Update imports
        if ($content -match "import.*logger.*from.*['""]$($config.OldImportPattern)['""]") {
            $newContent = $newContent -replace "import\s*{\s*logger\s*}\s*from\s*['""]$($config.OldImportPattern)['""]", 
                "import { $($config.ManagerName) } from '$(Get-RelativePath -from (Split-Path -Parent $file.FullName) -to $config.ManagerPath)'"
            $modified = $true
            $changes += "Updated logger import"
        }
        
        # Step 2: Replace logger variable declarations
        if ($content -match '\b(const|let|var)\s+logger\s*=') {
            $newContent = $newContent -replace '\b(const|let|var)\s+logger\s*=.*?;', ""
            $modified = $true
            $changes += "Removed logger variable declaration"
        }

        # Step 3: Replace logger usage patterns
        if ($content -match "logger\.(info|error|warn|debug)\(") {
            $logMatches = $content -replace "logger\.(info|error|warn|debug)\((.*?)(?=\))\)", 
                "$($config.ManagerName).getInstance().$1($2)"
            $newContent = $logMatches
            $modified = $true
            $changes += "Updated logger method calls"
        }

        # Step 4: Add import if using manager without import
        if ($newContent -match "$($config.ManagerName)\.getInstance\(\)" -and 
            -not ($newContent -match "import.*$($config.ManagerName)")) {
            
            $insertPoint = 0
            if ($newContent -match "^import.*`n") {
                $matches = [regex]::Matches($newContent, "^import.*`n", [System.Text.RegularExpressions.RegexOptions]::Multiline)
                if ($matches.Count -gt 0) {
                    $insertPoint = $matches[$matches.Count - 1].Index + $matches[$matches.Count - 1].Length
                }
            }
            
            $importStatement = "import { $($config.ManagerName) } from '$(Get-RelativePath -from (Split-Path -Parent $file.FullName) -to $config.ManagerPath)';`n"
            $newContent = $newContent.Insert($insertPoint, $importStatement)
            $modified = $true
            $changes += "Added LoggingManager import"
        }

        if ($modified) {
            if (-not $DryRun) {
                $newContent | Set-Content -Path $file.FullName -Force -Encoding UTF8
                $modifiedFiles += @{
                    Path = $file.FullName
                    Changes = $changes
                }
            }
            $stats.Modified++
        }
    }
    catch {
        Write-Host "Error processing $($file.FullName): $_" -ForegroundColor Red
        $stats.Errors++
    }
}

Write-Host "`n=== Migration Summary ===" -ForegroundColor Cyan
Write-Host "Files needing migration: $($stats.NeedsMigration)" -ForegroundColor Yellow
Write-Host "Files modified: $($stats.Modified)" -ForegroundColor Green
Write-Host "Files skipped: $($stats.Skipped)" -ForegroundColor Gray
Write-Host "Errors encountered: $($stats.Errors)" -ForegroundColor Red

if ($modifiedFiles.Count -gt 0) {
    Write-Host "`n=== Modified Files ===" -ForegroundColor Yellow
    foreach ($file in $modifiedFiles) {
        Write-Host "`nFile: $($file.Path)" -ForegroundColor Yellow
        foreach ($change in $file.Changes) {
            Write-Host "  - $change" -ForegroundColor Green
        }
    }
}

if (-not $SkipVerification -and -not $DryRun) {
    Write-Host "`nRunning verification..." -ForegroundColor Cyan
    & "$PSScriptRoot/verify-logger-migration-v4.ps1" -Verbose:$Verbose -SingleFile:$SingleFile -ForceCheck:$ForceCheck
}
