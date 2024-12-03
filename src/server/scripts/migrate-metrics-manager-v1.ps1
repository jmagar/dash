# Script to migrate MetricsManager usage to the singleton pattern
param (
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/metrics-manager-migration-config.ps1"

# MetricsManager source file path
$metricsManagerPath = Resolve-Path "$PSScriptRoot/../utils/metrics/MetricsManager.ts"

# Initialize counters
$filesScanned = 0
$filesModified = 0
$metricOperationMigrations = 0
$prometheusPatternMigrations = 0
$metricConfigMigrations = 0
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

function Update-MetricsManagerImports {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace import statements
    foreach ($pattern in $importPatterns) {
        if ($newContent -match $pattern) {
            $importPath = Get-MetricsManagerImportPath -currentFile $filePath -metricsManagerPath $metricsManagerPath
            $newContent = $newContent -replace $pattern, "import MetricsManager from '$importPath'"
            $modified = $true
            Write-VerboseMessage "Updated import in $filePath"
        }
    }
    
    return @{
        Content = $newContent
        Modified = $modified
    }
}

function Update-MetricsManagerUsage {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $modified = $false
    $newContent = $content
    
    # Replace direct instantiation with getInstance()
    foreach ($pattern in $usagePatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "MetricsManager.getInstance("
            $modified = $true
            Write-VerboseMessage "Updated MetricsManager instantiation in $filePath"
        }
    }
    
    # Update metric operation patterns
    foreach ($pattern in $metricPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "MetricsManager.getInstance().$($pattern)"
            $modified = $true
            $script:metricOperationMigrations++
            Write-VerboseMessage "Updated metric operation in $filePath"
        }
    }
    
    # Update Prometheus-specific patterns
    foreach ($pattern in $prometheusPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "MetricsManager.getInstance().$($pattern)"
            $modified = $true
            $script:prometheusPatternMigrations++
            Write-VerboseMessage "Updated Prometheus pattern in $filePath"
        }
    }
    
    # Update metric configuration patterns
    foreach ($pattern in $metricConfigPatterns) {
        if ($newContent -match $pattern) {
            $newContent = $newContent -replace $pattern, "MetricsManager.getInstance().$($pattern)"
            $modified = $true
            $script:metricConfigMigrations++
            Write-VerboseMessage "Updated metric configuration in $filePath"
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
        $importResult = Update-MetricsManagerImports -content $content -filePath $filePath
        $content = $importResult.Content
        
        # Update usage patterns
        $usageResult = Update-MetricsManagerUsage -content $content -filePath $filePath
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
Write-Host "Starting MetricsManager migration..."
Write-Host "Dry run: $DryRun"

$srcPath = Resolve-Path "$PSScriptRoot/.."
Process-Directory -dirPath $srcPath

# Print summary
Write-Host "`nMigration Summary:"
Write-Host "Files scanned: $filesScanned"
Write-Host "Files modified: $filesModified"
Write-Host "Metric operation migrations: $metricOperationMigrations"
Write-Host "Prometheus pattern migrations: $prometheusPatternMigrations"
Write-Host "Metric configuration migrations: $metricConfigMigrations"

if ($errors.Count -gt 0) {
    Write-Host "`nErrors encountered:"
    $errors | ForEach-Object { Write-Host "- $_" }
}

Write-Host "`nMigration completed!"
