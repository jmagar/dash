# Script to migrate DatabaseManager usage to the singleton pattern
param (
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/database-manager-migration-config.ps1"

# DatabaseManager source file path
$databaseManagerPath = Resolve-Path "$PSScriptRoot/../utils/database/DatabaseManager.ts"

# Initialize counters
$filesScanned = 0
$filesModified = 0
$connectionMigrations = 0
$queryMigrations = 0
$transactionMigrations = 0
$poolMigrations = 0
$migrationMigrations = 0
$errorMigrations = 0
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

function Update-DatabaseManagerImports {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace import statements
    foreach ($pattern in $importPatterns) {
        if ($newContent -match $pattern) {
            $importPath = Get-DatabaseManagerImportPath -currentFile $filePath -databaseManagerPath $databaseManagerPath
            $newContent = $newContent -replace $pattern, "import DatabaseManager from '$importPath'"
            $modified = $true
            Write-VerboseMessage "Updated import in $filePath"
        }
    }
    
    return @{
        Content = $newContent
        Modified = $modified
    }
}

function Update-DatabaseManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace direct instantiation with getInstance()
    foreach ($pattern in $usagePatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "DatabaseManager.getInstance("
            $modified = $true
            Write-VerboseMessage "Updated DatabaseManager instantiation in $filePath"
        }
    }
    
    # Update connection management patterns
    foreach ($pattern in $connectionPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "DatabaseManager.getInstance().$($pattern)"
            $modified = $true
            $script:connectionMigrations++
            Write-VerboseMessage "Updated connection management in $filePath"
        }
    }
    
    # Update query execution patterns
    foreach ($pattern in $queryPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "DatabaseManager.getInstance().$($pattern)"
            $modified = $true
            $script:queryMigrations++
            Write-VerboseMessage "Updated query execution in $filePath"
        }
    }
    
    # Update transaction management patterns
    foreach ($pattern in $transactionPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "DatabaseManager.getInstance().$($pattern)"
            $modified = $true
            $script:transactionMigrations++
            Write-VerboseMessage "Updated transaction management in $filePath"
        }
    }
    
    # Update pool management patterns
    foreach ($pattern in $poolPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "DatabaseManager.getInstance().$($pattern)"
            $modified = $true
            $script:poolMigrations++
            Write-VerboseMessage "Updated pool management in $filePath"
        }
    }
    
    # Update migration patterns
    foreach ($pattern in $migrationPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "DatabaseManager.getInstance().$($pattern)"
            $modified = $true
            $script:migrationMigrations++
            Write-VerboseMessage "Updated migration management in $filePath"
        }
    }
    
    # Update error handling patterns
    foreach ($pattern in $errorPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "DatabaseManager.getInstance().$($pattern)"
            $modified = $true
            $script:errorMigrations++
            Write-VerboseMessage "Updated error handling in $filePath"
        }
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
        $importResult = Update-DatabaseManagerImports -content $content -filePath $filePath
        $content = $importResult.Content
        
        # Update usage patterns
        $usageResult = Update-DatabaseManagerUsage -content $content -filePath $filePath
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
Write-Host "Starting DatabaseManager migration..."
Write-Host "Dry run: $DryRun"

$srcPath = Resolve-Path "$PSScriptRoot/.."
Process-Directory -dirPath $srcPath

# Print summary
Write-Host "`nMigration Summary:"
Write-Host "Files scanned: $filesScanned"
Write-Host "Files modified: $filesModified"
Write-Host "Connection migrations: $connectionMigrations"
Write-Host "Query migrations: $queryMigrations"
Write-Host "Transaction migrations: $transactionMigrations"
Write-Host "Pool migrations: $poolMigrations"
Write-Host "Migration migrations: $migrationMigrations"
Write-Host "Error migrations: $errorMigrations"

if ($errors.Count -gt 0) {
    Write-Host "`nErrors encountered:"
    $errors | ForEach-Object { Write-Host "- $_" }
}

Write-Host "`nMigration completed!"
