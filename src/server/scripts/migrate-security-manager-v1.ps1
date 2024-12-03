# Script to migrate SecurityManager usage to the singleton pattern
param (
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/security-manager-migration-config.ps1"

# SecurityManager source file path
$securityManagerPath = Resolve-Path "$PSScriptRoot/../utils/security/SecurityManager.ts"

# Initialize counters
$filesScanned = 0
$filesModified = 0
$authMigrations = 0
$authzMigrations = 0
$sessionMigrations = 0
$encryptionMigrations = 0
$auditMigrations = 0
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

function Update-SecurityManagerImports {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace import statements
    foreach ($pattern in $importPatterns) {
        if ($newContent -match $pattern) {
            $importPath = Get-SecurityManagerImportPath -currentFile $filePath -securityManagerPath $securityManagerPath
            $newContent = $newContent -replace $pattern, "import SecurityManager from '$importPath'"
            $modified = $true
            Write-VerboseMessage "Updated import in $filePath"
        }
    }
    
    return @{
        Content = $newContent
        Modified = $modified
    }
}

function Update-SecurityManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace direct instantiation with getInstance()
    foreach ($pattern in $usagePatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "SecurityManager.getInstance("
            $modified = $true
            Write-VerboseMessage "Updated SecurityManager instantiation in $filePath"
        }
    }
    
    # Update authentication patterns
    foreach ($pattern in $authPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "SecurityManager.getInstance().$($pattern)"
            $modified = $true
            $script:authMigrations++
            Write-VerboseMessage "Updated authentication pattern in $filePath"
        }
    }
    
    # Update authorization patterns
    foreach ($pattern in $authzPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "SecurityManager.getInstance().$($pattern)"
            $modified = $true
            $script:authzMigrations++
            Write-VerboseMessage "Updated authorization pattern in $filePath"
        }
    }
    
    # Update session patterns
    foreach ($pattern in $sessionPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "SecurityManager.getInstance().$($pattern)"
            $modified = $true
            $script:sessionMigrations++
            Write-VerboseMessage "Updated session pattern in $filePath"
        }
    }
    
    # Update encryption patterns
    foreach ($pattern in $encryptionPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "SecurityManager.getInstance().$($pattern)"
            $modified = $true
            $script:encryptionMigrations++
            Write-VerboseMessage "Updated encryption pattern in $filePath"
        }
    }
    
    # Update audit patterns
    foreach ($pattern in $auditPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "SecurityManager.getInstance().$($pattern)"
            $modified = $true
            $script:auditMigrations++
            Write-VerboseMessage "Updated audit pattern in $filePath"
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
        
        # Skip files that don't contain SecurityManager
        if ($content -match "SecurityManager") {
            Write-VerboseMessage "Processing $filePath"
            
            $importResult = Update-SecurityManagerImports -content $content -filePath $filePath
            $usageResult = Update-SecurityManagerUsage -content $importResult.Content -filePath $filePath
            
            if ($importResult.Modified -or $usageResult.Modified) {
                if (-not $DryRun) {
                    # Create backup
                    $backupPath = Join-Path $backupRoot (Split-Path $filePath -Leaf)
                    Copy-Item -Path $filePath -Destination $backupPath -Force
                    
                    # Write changes
                    Set-Content -Path $filePath -Value $usageResult.Content
                    $script:filesModified++
                }
            }
            
            $script:filesScanned++
        }
    }
    catch {
        $script:errors += "Error processing $filePath : $_"
        Write-Error "Error processing $filePath : $_"
    }
}

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
$srcPath = Split-Path $PSScriptRoot -Parent
Process-Directory -dirPath $srcPath

# Print results
Write-Host "`nMigration Summary:"
Write-Host "Files scanned: $filesScanned"
Write-Host "Files modified: $filesModified"
Write-Host "Authentication migrations: $authMigrations"
Write-Host "Authorization migrations: $authzMigrations"
Write-Host "Session migrations: $sessionMigrations"
Write-Host "Encryption migrations: $encryptionMigrations"
Write-Host "Audit migrations: $auditMigrations"

if ($errors.Count -gt 0) {
    Write-Host "`nErrors encountered:"
    $errors | ForEach-Object {
        Write-Host "  $_"
    }
}

Write-Host "`nMigration completed!"
