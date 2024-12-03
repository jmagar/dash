# Configuration for MonitoringManager migration

# Directories to exclude from migration
$excludedDirs = @(
    "node_modules",
    "dist",
    "build",
    ".git"
)

# File patterns to include in migration
$includePatterns = @(
    "*.ts",
    "*.tsx"
)

# Backup directory for modified files
$backupDir = "migrations/monitoring-manager/backup"

# Import patterns to match
$importPatterns = @(
    "import\s*{\s*MonitoringManager\s*}\s*from\s*['"](\.{1,2}/)*utils/monitoring/MonitoringManager['"]",
    "import\s*\*\s*as\s*MonitoringManager\s*from\s*['"](\.{1,2}/)*utils/monitoring/MonitoringManager['"]",
    "import\s*MonitoringManager\s*from\s*['"](\.{1,2}/)*utils/monitoring/MonitoringManager['"]"
)

# Usage patterns to match
$usagePatterns = @(
    "new\s+MonitoringManager\s*\(",
    "MonitoringManager\.createInstance\s*\(",
    "MonitoringManager\.initialize\s*\(",
    "MonitoringManager\.setup\s*\("
)

# Metric patterns
$metricPatterns = @(
    "recordMetric\s*\(",
    "incrementMetric\s*\(",
    "decrementMetric\s*\(",
    "setMetric\s*\(",
    "trackMetric\s*\("
)

# Event patterns
$eventPatterns = @(
    "recordEvent\s*\(",
    "trackEvent\s*\(",
    "logEvent\s*\(",
    "emitEvent\s*\(",
    "publishEvent\s*\("
)

# Performance patterns
$performancePatterns = @(
    "startTimer\s*\(",
    "stopTimer\s*\(",
    "measureTime\s*\(",
    "trackPerformance\s*\(",
    "recordLatency\s*\("
)

# Error tracking patterns
$errorTrackingPatterns = @(
    "recordError\s*\(",
    "trackError\s*\(",
    "logError\s*\(",
    "captureError\s*\(",
    "reportError\s*\("
)

# Resource patterns
$resourcePatterns = @(
    "trackResource\s*\(",
    "monitorResource\s*\(",
    "watchResource\s*\(",
    "measureResource\s*\(",
    "recordResourceUsage\s*\("
)

# Alert patterns
$alertPatterns = @(
    "setAlert\s*\(",
    "createAlert\s*\(",
    "configureAlert\s*\(",
    "updateAlert\s*\(",
    "removeAlert\s*\("
)

# Dashboard patterns
$dashboardPatterns = @(
    "createDashboard\s*\(",
    "updateDashboard\s*\(",
    "configureDashboard\s*\(",
    "addWidget\s*\(",
    "removeWidget\s*\("
)

# Configuration patterns
$configPatterns = @(
    "setConfig\s*\(",
    "updateConfig\s*\(",
    "configure\s*\(",
    "setOptions\s*\(",
    "updateSettings\s*\("
)

function Should-ExcludeDirectory {
    param (
        [string]$dirPath
    )
    
    $dirName = Split-Path $dirPath -Leaf
    return $dirName -in $excludedDirs
}

function Get-MonitoringManagerImportPath {
    param (
        [string]$currentFile,
        [string]$monitoringManagerPath
    )
    
    $currentDir = Split-Path $currentFile -Parent
    $relativePath = Resolve-Path -Relative -Path $monitoringManagerPath -BasePath $currentDir
    $relativePath = $relativePath -replace '\\', '/'
    $relativePath = $relativePath -replace '^\./', ''
    return $relativePath
}
