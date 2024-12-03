# Script to migrate RequestManager usage to new patterns
param (
    [switch]$DryRun,
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/request-manager-migration-config.ps1"

# Initialize counters
$stats = @{
    FilesProcessed = 0
    FilesModified = 0
    ImportPatternsMigrated = 0
    UsagePatternsMigrated = 0
    RequestPatternsMigrated = 0
    ConfigPatternsMigrated = 0
    ResponsePatternsMigrated = 0
    MiddlewarePatternsMigrated = 0
    InterceptorPatternsMigrated = 0
    CachePatternsMigrated = 0
    ErrorPatternsMigrated = 0
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Backup-File {
    param (
        [string]$FilePath
    )
    
    $backupPath = Join-Path $backupDir (Split-Path $FilePath -Leaf)
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    Copy-Item $FilePath $backupPath -Force
    Write-VerboseMessage "Created backup: $backupPath"
}

function Update-ImportStatements {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $importPatterns) {
        $updatedContent = $updatedContent -replace $pattern, "import { RequestManager } from '@utils/request'"
    }
    
    return $updatedContent
}

function Update-UsagePatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $usagePatterns) {
        $updatedContent = $updatedContent -replace $pattern, "RequestManager.getInstance()"
    }
    
    return $updatedContent
}

function Update-RequestPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $requestPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.RequestPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "RequestManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-ConfigPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $configPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.ConfigPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "RequestManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-ResponsePatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $responsePatterns) {
        if ($updatedContent -match $pattern) {
            $stats.ResponsePatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "RequestManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-MiddlewarePatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $middlewarePatterns) {
        if ($updatedContent -match $pattern) {
            $stats.MiddlewarePatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "RequestManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-InterceptorPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $interceptorPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.InterceptorPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "RequestManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-CachePatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $cachePatterns) {
        if ($updatedContent -match $pattern) {
            $stats.CachePatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "RequestManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Update-ErrorPatterns {
    param (
        [string]$content
    )
    
    $updatedContent = $content
    
    foreach ($pattern in $errorPatterns) {
        if ($updatedContent -match $pattern) {
            $stats.ErrorPatternsMigrated++
            $updatedContent = $updatedContent -replace "(?<!getInstance\(\)\.)" + $pattern, "RequestManager.getInstance().$&"
        }
    }
    
    return $updatedContent
}

function Process-File {
    param (
        [string]$filePath
    )
    
    try {
        $content = Get-Content -Path $filePath -Raw
        
        # Skip files with no RequestManager
        if ($content -notmatch "RequestManager") {
            return
        }
        
        Write-VerboseMessage "Processing $filePath"
        $stats.FilesProcessed++
        
        $originalContent = $content
        $updatedContent = $content
        
        # Apply all updates
        $updatedContent = Update-ImportStatements -content $updatedContent
        $updatedContent = Update-UsagePatterns -content $updatedContent
        $updatedContent = Update-RequestPatterns -content $updatedContent
        $updatedContent = Update-ConfigPatterns -content $updatedContent
        $updatedContent = Update-ResponsePatterns -content $updatedContent
        $updatedContent = Update-MiddlewarePatterns -content $updatedContent
        $updatedContent = Update-InterceptorPatterns -content $updatedContent
        $updatedContent = Update-CachePatterns -content $updatedContent
        $updatedContent = Update-ErrorPatterns -content $updatedContent
        
        # Only proceed if content was modified
        if ($updatedContent -ne $originalContent) {
            $stats.FilesModified++
            
            if (-not $DryRun) {
                Backup-File -FilePath $filePath
                Set-Content -Path $filePath -Value $updatedContent
                Write-VerboseMessage "Updated $filePath"
            }
        }
    }
    catch {
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

# Main execution
Write-Host "Starting RequestManager migration..."
if ($DryRun) {
    Write-Host "Running in dry-run mode - no files will be modified"
}

$srcPath = Resolve-Path "$PSScriptRoot/.."
Process-Directory -dirPath $srcPath

# Print results
Write-Host "`nMigration Summary:"
Write-Host "Files processed: $($stats.FilesProcessed)"
Write-Host "Files modified: $($stats.FilesModified)"
Write-Host "Import patterns migrated: $($stats.ImportPatternsMigrated)"
Write-Host "Usage patterns migrated: $($stats.UsagePatternsMigrated)"
Write-Host "Request patterns migrated: $($stats.RequestPatternsMigrated)"
Write-Host "Config patterns migrated: $($stats.ConfigPatternsMigrated)"
Write-Host "Response patterns migrated: $($stats.ResponsePatternsMigrated)"
Write-Host "Middleware patterns migrated: $($stats.MiddlewarePatternsMigrated)"
Write-Host "Interceptor patterns migrated: $($stats.InterceptorPatternsMigrated)"
Write-Host "Cache patterns migrated: $($stats.CachePatternsMigrated)"
Write-Host "Error patterns migrated: $($stats.ErrorPatternsMigrated)"

Write-Host "`nMigration completed!"

# Return non-zero exit code if no files were modified
exit $(if ($stats.FilesModified -eq 0) { 1 } else { 0 })
