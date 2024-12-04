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
    
    # More comprehensive pattern matching
    return ($content -match "import.*logger.*from" -or 
            $content -match "logger\." -or  # Catch any logger usage
            $content -match "const\s+logger" -or  # Catch logger declarations
            $content -match "let\s+logger" -or
            $content -match "var\s+logger" -or
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

# Process a single file
function Process-File {
    param([System.IO.FileInfo]$file)
    
    Write-Verbose "`nProcessing $($file.FullName)..."
    
    try {
        # Read file content
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) {
            Write-Verbose "Skipped - Empty file"
            return
        }
        
        $modified = $false
        $changes = @()
        
        # Step 1: Update imports
        $newContent = Update-ImportStatements -content $content -filePath $file.FullName
        if ($newContent -ne $content) {
            $modified = $true
            $changes += "Updated LoggingManager import"
            $content = $newContent
        }
        
        # Step 2: Replace logger declarations
        if ($content -match "(const|let|var)\s+logger\s*=") {
            $updatedContent = $content -replace "(const|let|var)\s+logger\s*=.*?;", ""
            if ($updatedContent -ne $content) {
                $modified = $true
                $changes += "Removed logger declaration"
                $content = $updatedContent
            }
        }
        
        # Step 3: Replace logger usage patterns
        if ($content -match "logger\.") {
            $updatedContent = $content -replace "logger\.(info|error|warn|debug)\((.*?)(?=\))\)", 
                "LoggingManager.getInstance().$1($2)"
            if ($updatedContent -ne $content) {
                $modified = $true
                $changes += "Updated logger method calls"
                $content = $updatedContent
            }
        }
        
        # Only save if modifications were made
        if ($modified) {
            if (-not $DryRun) {
                # Create backup if enabled
                if ($BackupFiles) {
                    $backupDir = Join-Path $config.BackupDir (Split-Path -Parent $file.FullName)
                    if (-not (Test-Path $backupDir)) {
                        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
                    }
                    $backupFile = Join-Path $backupDir $file.Name
                    Copy-Item $file.FullName $backupFile -Force
                }
                
                # Save changes
                $content | Set-Content $file.FullName -Encoding UTF8 -NoNewline
                Write-Host "Modified $($file.FullName) - $($changes -join ', ')"
                
                # Track modified files for summary
                $script:modifiedFiles += @{
                    Path = $file.FullName
                    Changes = $changes
                }
                $script:stats.Modified++
            } else {
                Write-Host "[DRY RUN] Would modify $($file.FullName) - $($changes -join ', ')"
            }
        }
    } catch {
        Write-Error "Error processing $($file.FullName): $_"
        $script:stats.Errors++
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
        Process-File -file $file
        
        # Check if file needs migration
        if (-not (Test-ShouldProcessFile -content (Get-Content -Path $file.FullName -Raw) -filePath $file.FullName)) {
            $stats.Skipped++
            Write-VerboseLog "Skipped - No logger usage found" "Gray"
            continue
        }
        
        $stats.NeedsMigration++
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
