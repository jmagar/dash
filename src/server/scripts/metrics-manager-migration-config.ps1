# Common configuration for MetricsManager migration scripts

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

# Import patterns to search for and replace
$importPatterns = @(
    "import\s*{\s*MetricsManager\s*}\s*from\s*['"](\.{1,2}/)*utils/metrics/MetricsManager['"]",
    "import\s*\*\s*as\s*MetricsManager\s*from\s*['"](\.{1,2}/)*utils/metrics/MetricsManager['"]",
    "import\s*MetricsManager\s*from\s*['"](\.{1,2}/)*utils/metrics/MetricsManager['"]"
)

# Usage patterns to identify MetricsManager instantiation
$usagePatterns = @(
    "new\s+MetricsManager\s*\(",
    "MetricsManager\.createInstance\s*\(",
    "MetricsManager\.initialize\s*\(",
    "MetricsManager\.setup\s*\("
)

# Metric operation patterns
$metricPatterns = @(
    "recordMetric\s*\(",
    "incrementCounter\s*\(",
    "decrementCounter\s*\(",
    "updateGauge\s*\(",
    "observeHistogram\s*\(",
    "startTimer\s*\(",
    "stopTimer\s*\(",
    "recordDuration\s*\("
)

# Prometheus-specific patterns
$prometheusPatterns = @(
    "registerMetric\s*\(",
    "createPrometheusMetric\s*\(",
    "getPrometheusMetrics\s*\(",
    "exportMetrics\s*\("
)

# Metric configuration patterns
$metricConfigPatterns = @(
    "setMetricPrefix\s*\(",
    "addMetricLabel\s*\(",
    "removeMetricLabel\s*\(",
    "configureMetricBuckets\s*\(",
    "setMetricNamespace\s*\("
)

# Backup directory for modified files
$backupDir = "migrations/metrics-manager/backup"

# Function to calculate relative path between two directories
function Get-RelativePath {
    param (
        [string]$from,
        [string]$to
    )
    
    $fromParts = $from.Replace('\', '/').Split('/')
    $toParts = $to.Replace('\', '/').Split('/')
    
    $commonPrefixLength = 0
    $minLength = [Math]::Min($fromParts.Length, $toParts.Length)
    
    for ($i = 0; $i -lt $minLength; $i++) {
        if ($fromParts[$i] -eq $toParts[$i]) {
            $commonPrefixLength++
        }
        else {
            break
        }
    }
    
    $backCount = $fromParts.Length - $commonPrefixLength - 1
    $relativePath = ""
    
    if ($backCount -gt 0) {
        $relativePath = "../" * $backCount
    }
    
    $remainingPath = $toParts[$commonPrefixLength..($toParts.Length-1)]
    if ($remainingPath) {
        $relativePath += [string]::Join("/", $remainingPath)
    }
    
    if (-not $relativePath) {
        $relativePath = "./"
    }
    
    return $relativePath
}

# Function to backup a file before modification
function Backup-File {
    param (
        [string]$filePath,
        [string]$backupRoot
    )
    
    $relativePath = $filePath.Replace($PSScriptRoot, "").TrimStart("\")
    $backupPath = Join-Path $backupRoot $relativePath
    $backupDir = Split-Path $backupPath -Parent
    
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    
    Copy-Item -Path $filePath -Destination $backupPath -Force
    return $backupPath
}

# Function to check if a directory should be excluded
function Should-ExcludeDirectory {
    param (
        [string]$dirPath
    )
    
    foreach ($excluded in $excludedDirs) {
        if ($dirPath -match $excluded) {
            return $true
        }
    }
    return $false
}

# Function to get correct import path
function Get-MetricsManagerImportPath {
    param (
        [string]$currentFile,
        [string]$metricsManagerPath
    )
    
    $relativePath = Get-RelativePath -from (Split-Path $currentFile -Parent) -to (Split-Path $metricsManagerPath -Parent)
    return $relativePath.TrimEnd("/") + "/MetricsManager"
}

# Function to check if file needs metrics-specific migration
function Should-MigrateMetricsSpecific {
    param (
        [string]$content
    )
    
    foreach ($pattern in $metricPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $prometheusPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $metricConfigPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    return $false
}
