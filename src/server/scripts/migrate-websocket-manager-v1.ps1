# Script to migrate WebSocketManager usage to the singleton pattern
param (
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/websocket-manager-migration-config.ps1"

# WebSocketManager source file path
$webSocketManagerPath = Resolve-Path "$PSScriptRoot/../utils/websocket/WebSocketManager.ts"

# Initialize counters
$filesScanned = 0
$filesModified = 0
$connectionMigrations = 0
$messageMigrations = 0
$eventMigrations = 0
$roomMigrations = 0
$securityMigrations = 0
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

function Update-WebSocketManagerImports {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace import statements
    foreach ($pattern in $importPatterns) {
        if ($newContent -match $pattern) {
            $importPath = Get-WebSocketManagerImportPath -currentFile $filePath -webSocketManagerPath $webSocketManagerPath
            $newContent = $newContent -replace $pattern, "import WebSocketManager from '$importPath'"
            $modified = $true
            Write-VerboseMessage "Updated import in $filePath"
        }
    }
    
    return @{
        Content = $newContent
        Modified = $modified
    }
}

function Update-WebSocketManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace direct instantiation with getInstance()
    foreach ($pattern in $usagePatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "WebSocketManager.getInstance("
            $modified = $true
            Write-VerboseMessage "Updated WebSocketManager instantiation in $filePath"
        }
    }
    
    # Update connection patterns
    foreach ($pattern in $connectionPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "WebSocketManager.getInstance().$($pattern)"
            $modified = $true
            $script:connectionMigrations++
            Write-VerboseMessage "Updated connection pattern in $filePath"
        }
    }
    
    # Update message patterns
    foreach ($pattern in $messagePatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "WebSocketManager.getInstance().$($pattern)"
            $modified = $true
            $script:messageMigrations++
            Write-VerboseMessage "Updated message pattern in $filePath"
        }
    }
    
    # Update event patterns
    foreach ($pattern in $eventPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "WebSocketManager.getInstance().$($pattern)"
            $modified = $true
            $script:eventMigrations++
            Write-VerboseMessage "Updated event pattern in $filePath"
        }
    }
    
    # Update room patterns
    foreach ($pattern in $roomPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "WebSocketManager.getInstance().$($pattern)"
            $modified = $true
            $script:roomMigrations++
            Write-VerboseMessage "Updated room pattern in $filePath"
        }
    }
    
    # Update security patterns
    foreach ($pattern in $securityPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "WebSocketManager.getInstance().$($pattern)"
            $modified = $true
            $script:securityMigrations++
            Write-VerboseMessage "Updated security pattern in $filePath"
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
        
        # Skip files that don't contain WebSocketManager
        if ($content -match "WebSocketManager") {
            Write-VerboseMessage "Processing $filePath"
            
            $importResult = Update-WebSocketManagerImports -content $content -filePath $filePath
            $usageResult = Update-WebSocketManagerUsage -content $importResult.Content -filePath $filePath
            
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
Write-Host "Connection migrations: $connectionMigrations"
Write-Host "Message migrations: $messageMigrations"
Write-Host "Event migrations: $eventMigrations"
Write-Host "Room migrations: $roomMigrations"
Write-Host "Security migrations: $securityMigrations"

if ($errors.Count -gt 0) {
    Write-Host "`nErrors encountered:"
    $errors | ForEach-Object {
        Write-Host "  $_"
    }
}

Write-Host "`nMigration completed!"
