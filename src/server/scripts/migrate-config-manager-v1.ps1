# Script to migrate ConfigManager usage to the singleton pattern
param (
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/config-manager-migration-config.ps1"

# ConfigManager source file path
$configManagerPath = Resolve-Path "$PSScriptRoot/../utils/config/ConfigManager.ts"

# Initialize counters
$filesScanned = 0
$filesModified = 0
$configMigrations = 0
$errors = @()

# Create backup directory if it doesn't exist
$backupRoot = Join-Path $PSScriptRoot $backupDir
if (-not (Test-Path $backupRoot)) {
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Update-ConfigManagerImports {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace import statements
    foreach ($pattern in $importPatterns) {
        if ($newContent -match $pattern) {
            $importPath = Get-ConfigManagerImportPath -currentFile $filePath -configManagerPath $configManagerPath
            $newContent = $newContent -replace $pattern, "import ConfigManager from '$importPath'"
            $modified = $true
            Write-VerboseMessage "Updated import in $filePath"
        }
    }
    
    return @{
        Content = $newContent
        Modified = $modified
    }
}

function Update-ConfigManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace direct instantiation with getInstance()
    foreach ($pattern in $usagePatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "ConfigManager.getInstance("
            $modified = $true
            Write-VerboseMessage "Updated ConfigManager instantiation in $filePath"
        }
    }
    
    # Replace direct process.env usage with ConfigManager
    if (Should-MigrateConfig $content) {
        $newContent = $newContent -replace "process\.env\.(\w+)", "ConfigManager.getInstance().get('$1')"
        $modified = $true
        $script:configMigrations++
        Write-VerboseMessage "Migrated environment variable access in $filePath"
    }
    
    return @{
        Content = $newContent
        Modified = $modified
    }
}

function Process-File {
    param (
        [string]$filePath
    )
    
    try {
        $content = Get-Content -Path $filePath -Raw
        $originalContent = $content
        
        # Update imports
        $importResult = Update-ConfigManagerImports -content $content -filePath $filePath
        $content = $importResult.Content
        
        # Update usage patterns
        $usageResult = Update-ConfigManagerUsage -content $content -filePath $filePath
        $content = $usageResult.Content
        
        # If changes were made, backup and save the file
        if ($importResult.Modified -or $usageResult.Modified) {
            if (-not $DryRun) {
                $backupPath = Backup-File -filePath $filePath -backupRoot $backupRoot
                Write-VerboseMessage "Backed up $filePath to $backupPath"
                
                Set-Content -Path $filePath -Value $content
                Write-VerboseMessage "Updated $filePath"
            }
            $script:filesModified++
        }
    }
    catch {
        $script:errors += "Error processing $filePath : $_"
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
            Write-VerboseMessage "Processing $($_.FullName)"
            Process-File -filePath $_.FullName
        }
    }
    
    # Recursively process subdirectories
    Get-ChildItem -Path $dirPath -Directory | ForEach-Object {
        Process-Directory -dirPath $_.FullName
    }
}

# Main execution
Write-Host "Starting ConfigManager migration..."
Write-Host "Dry run: $DryRun"

$srcPath = Resolve-Path "$PSScriptRoot/.."
Process-Directory -dirPath $srcPath

# Print summary
Write-Host "`nMigration Summary:"
Write-Host "Files scanned: $filesScanned"
Write-Host "Files modified: $filesModified"
Write-Host "Config migrations: $configMigrations"

if ($errors.Count -gt 0) {
    Write-Host "`nErrors encountered:"
    $errors | ForEach-Object { Write-Host "- $_" }
}

Write-Host "`nMigration completed!"
