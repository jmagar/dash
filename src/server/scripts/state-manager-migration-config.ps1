# Common configuration for StateManager migration scripts

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
    "import\s*{\s*StateManager\s*}\s*from\s*['"](\.{1,2}/)*utils/state/StateManager['"]",
    "import\s*\*\s*as\s*StateManager\s*from\s*['"](\.{1,2}/)*utils/state/StateManager['"]",
    "import\s*StateManager\s*from\s*['"](\.{1,2}/)*utils/state/StateManager['"]"
)

# Usage patterns to identify StateManager instantiation
$usagePatterns = @(
    "new\s+StateManager\s*\(",
    "StateManager\.createInstance\s*\(",
    "StateManager\.initialize\s*\(",
    "StateManager\.setup\s*\("
)

# State operation patterns
$stateOperationPatterns = @(
    "setState\s*\(",
    "getState\s*\(",
    "updateState\s*\(",
    "deleteState\s*\(",
    "mergeState\s*\(",
    "resetState\s*\(",
    "clearState\s*\(",
    "initializeState\s*\("
)

# State subscription patterns
$stateSubscriptionPatterns = @(
    "subscribe\s*\(",
    "unsubscribe\s*\(",
    "notify\s*\(",
    "addListener\s*\(",
    "removeListener\s*\("
)

# State persistence patterns
$statePersistencePatterns = @(
    "saveState\s*\(",
    "loadState\s*\(",
    "persistState\s*\(",
    "hydrate\s*\(",
    "dehydrate\s*\("
)

# State validation patterns
$stateValidationPatterns = @(
    "validateState\s*\(",
    "checkStateIntegrity\s*\(",
    "verifyStateTransition\s*\(",
    "enforceSchema\s*\("
)

# Backup directory for modified files
$backupDir = "migrations/state-manager/backup"

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
function Get-StateManagerImportPath {
    param (
        [string]$currentFile,
        [string]$stateManagerPath
    )
    
    $relativePath = Get-RelativePath -from (Split-Path $currentFile -Parent) -to (Split-Path $stateManagerPath -Parent)
    return $relativePath.TrimEnd("/") + "/StateManager"
}

# State-specific patterns to identify and migrate
$statePatterns = @(
    # State persistence
    "persistState\s*\(",
    "loadPersistedState\s*\(",
    
    # State synchronization
    "syncState\s*\(",
    "broadcastState\s*\(",
    
    # Event handling
    "onStateChange\s*\(",
    "subscribeToState\s*\(",
    
    # Cache invalidation
    "invalidateCache\s*\(",
    "refreshCache\s*\("
)

# State event patterns
$stateEventPatterns = @(
    "addStateListener\s*\(",
    "removeStateListener\s*\(",
    "emitStateChange\s*\("
)

# Function to check if file needs state-specific migration
function Should-MigrateStateSpecific {
    param (
        [string]$content
    )
    
    foreach ($pattern in $statePatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $stateEventPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    return $false
}
