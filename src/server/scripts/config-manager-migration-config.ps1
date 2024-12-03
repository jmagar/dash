# Common configuration for ConfigManager migration scripts

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
    "import\s*{\s*ConfigManager\s*}\s*from\s*['"](\.{1,2}/)*utils/config/ConfigManager['"]",
    "import\s*\*\s*as\s*ConfigManager\s*from\s*['"](\.{1,2}/)*utils/config/ConfigManager['"]",
    "import\s*ConfigManager\s*from\s*['"](\.{1,2}/)*utils/config/ConfigManager['"]"
)

# Usage patterns to identify ConfigManager instantiation
$usagePatterns = @(
    "new\s+ConfigManager\s*\(",
    "ConfigManager\.createInstance\s*\(",
    "ConfigManager\.load\s*\(",
    "ConfigManager\.init\s*\("
)

# Additional patterns specific to ConfigManager
$configPatterns = @(
    "process\.env\.",
    "dotenv\.config\s*\(",
    "config\s*=\s*require\s*\(['\"]config['\"]\)"
)

# Backup directory for modified files
$backupDir = "migrations/config-manager/backup"

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
function Get-ConfigManagerImportPath {
    param (
        [string]$currentFile,
        [string]$configManagerPath
    )
    
    $relativePath = Get-RelativePath -from (Split-Path $currentFile -Parent) -to (Split-Path $configManagerPath -Parent)
    return $relativePath.TrimEnd("/") + "/ConfigManager"
}

# Function to check if file needs config migration
function Should-MigrateConfig {
    param (
        [string]$content
    )
    
    foreach ($pattern in $configPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    return $false
}
