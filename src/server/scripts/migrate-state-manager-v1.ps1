# Script to migrate StateManager usage to the singleton pattern
param (
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/state-manager-migration-config.ps1"

# StateManager source file path
$stateManagerPath = Resolve-Path "$PSScriptRoot/../utils/state/StateManager.ts"

# Initialize counters
$filesScanned = 0
$filesModified = 0
$stateOperationMigrations = 0
$subscriptionMigrations = 0
$persistenceMigrations = 0
$validationMigrations = 0
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

function Update-StateManagerImports {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace import statements
    foreach ($pattern in $importPatterns) {
        if ($newContent -match $pattern) {
            $importPath = Get-StateManagerImportPath -currentFile $filePath -stateManagerPath $stateManagerPath
            $newContent = $newContent -replace $pattern, "import StateManager from '$importPath'"
            $modified = $true
            Write-VerboseMessage "Updated import in $filePath"
        }
    }
    
    return @{
        Content = $newContent
        Modified = $modified
    }
}

function Update-StateManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace direct instantiation with getInstance()
    foreach ($pattern in $usagePatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "StateManager.getInstance("
            $modified = $true
            Write-VerboseMessage "Updated StateManager instantiation in $filePath"
        }
    }
    
    # Update state operation patterns
    foreach ($pattern in $stateOperationPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "StateManager.getInstance().$($pattern)"
            $modified = $true
            $script:stateOperationMigrations++
            Write-VerboseMessage "Updated state operation in $filePath"
        }
    }
    
    # Update subscription patterns
    foreach ($pattern in $stateSubscriptionPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "StateManager.getInstance().$($pattern)"
            $modified = $true
            $script:subscriptionMigrations++
            Write-VerboseMessage "Updated subscription pattern in $filePath"
        }
    }
    
    # Update persistence patterns
    foreach ($pattern in $statePersistencePatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "StateManager.getInstance().$($pattern)"
            $modified = $true
            $script:persistenceMigrations++
            Write-VerboseMessage "Updated persistence pattern in $filePath"
        }
    }
    
    # Update validation patterns
    foreach ($pattern in $stateValidationPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "StateManager.getInstance().$($pattern)"
            $modified = $true
            $script:validationMigrations++
            Write-VerboseMessage "Updated validation pattern in $filePath"
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
        $importResult = Update-StateManagerImports -content $content -filePath $filePath
        $content = $importResult.Content
        
        # Update usage patterns
        $usageResult = Update-StateManagerUsage -content $content -filePath $filePath
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
Write-Host "Starting StateManager migration..."
Write-Host "Dry run: $DryRun"

$srcPath = Resolve-Path "$PSScriptRoot/.."
Process-Directory -dirPath $srcPath

# Print summary
Write-Host "`nMigration Summary:"
Write-Host "Files scanned: $filesScanned"
Write-Host "Files modified: $filesModified"
Write-Host "State operation migrations: $stateOperationMigrations"
Write-Host "Subscription migrations: $subscriptionMigrations"
Write-Host "Persistence migrations: $persistenceMigrations"
Write-Host "Validation migrations: $validationMigrations"

if ($errors.Count -gt 0) {
    Write-Host "`nErrors encountered:"
    $errors | ForEach-Object { Write-Host "- $_" }
}

Write-Host "`nMigration completed!"
