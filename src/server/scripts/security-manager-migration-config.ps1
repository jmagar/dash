# Configuration for SecurityManager migration

# Directories to exclude from migration
$excludedDirs = @(
    "node_modules",
    "dist",
    "build",
    ".git",
    "coverage"
)

# File patterns to include in migration
$includePatterns = @(
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
)

# Backup directory name
$backupDir = "migrations/security-manager/backup"

# Import patterns to match
$importPatterns = @(
    "import\s+{\s*SecurityManager\s*}",
    "import\s+SecurityManager\s+from\s+['\"](?!.*utils/security/SecurityManager)[^'\"]+['\"]",
    "require\(['\"].*SecurityManager['\"]",
    "import\s*{\s*SecurityManager\s*}\s*from\s*['"](\.{1,2}/)*utils/security/SecurityManager['"]",
    "import\s*\*\s*as\s*SecurityManager\s*from\s*['"](\.{1,2}/)*utils/security/SecurityManager['"]",
    "import\s*SecurityManager\s*from\s*['"](\.{1,2}/)*utils/security/SecurityManager['\"]"
)

# Usage patterns to match
$usagePatterns = @(
    "new\s+SecurityManager",
    "SecurityManager\(",
    "createSecurityManager",
    "new\s+SecurityManager\s*\(",
    "SecurityManager\.createInstance\s*\(",
    "SecurityManager\.initialize\s*\(",
    "SecurityManager\.setup\s*\("
)

# Authentication patterns
$authPatterns = @(
    "authenticate\s*\(",
    "login\s*\(",
    "logout\s*\(",
    "validateToken\s*\(",
    "refreshToken\s*\(",
    "validateCredentials\s*\(",
    "verifyToken\s*\(",
    "generateToken\s*\(",
    "revokeToken\s*\("
)

# Authorization patterns
$authzPatterns = @(
    "checkPermission\s*\(",
    "hasRole\s*\(",
    "grantRole\s*\(",
    "revokeRole\s*\(",
    "validateAccess\s*\(",
    "authorize\s*\(",
    "checkPermission\s*\(",
    "hasRole\s*\(",
    "grantPermission\s*\(",
    "revokePermission\s*\(",
    "addRole\s*\(",
    "removeRole\s*\("
)

# Session patterns
$sessionPatterns = @(
    "createSession\s*\(",
    "destroySession\s*\(",
    "validateSession\s*\(",
    "refreshSession\s*\(",
    "getSessionData\s*\(",
    "setSessionData\s*\("
)

# Encryption patterns
$encryptionPatterns = @(
    "encrypt\s*\(",
    "decrypt\s*\(",
    "hash\s*\(",
    "generateKey\s*\(",
    "validateHash\s*\(",
    "verify\s*\("
)

# Audit patterns
$auditPatterns = @(
    "logSecurityEvent\s*\(",
    "trackActivity\s*\(",
    "recordAttempt\s*\(",
    "auditAccess\s*\(",
    "generateReport\s*\(",
    "logSecurityEvent\s*\(",
    "getAuditLog\s*\(",
    "trackUserActivity\s*\(",
    "recordAuthAttempt\s*\(",
    "recordAccessAttempt\s*\("
)

# Security configuration patterns
$securityConfigPatterns = @(
    "setSecurityPolicy\s*\(",
    "updateSecuritySettings\s*\(",
    "configurePasswordPolicy\s*\(",
    "setRateLimiting\s*\(",
    "configureCORS\s*\(",
    "setCSRFProtection\s*\("
)

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

# Function to get SecurityManager import path
function Get-SecurityManagerImportPath {
    param (
        [string]$currentFile,
        [string]$securityManagerPath
    )
    
    $currentDir = Split-Path $currentFile -Parent
    $relPath = Resolve-Path -Relative -Path $securityManagerPath -BasePath $currentDir
    $relPath = $relPath -replace '\\', '/'
    if ($relPath.StartsWith("./")) {
        $relPath = $relPath.Substring(2)
    }
    return $relPath
}

# Function to get the correct import path
function Get-SecurityManagerImportPath {
    param (
        [string]$currentFile,
        [string]$securityManagerPath
    )
    
    $currentDir = Split-Path $currentFile -Parent
    $relPath = Resolve-Path -Relative -Path $securityManagerPath -BasePath $currentDir
    $relPath = $relPath -replace '\\', '/'
    if ($relPath.StartsWith("./")) {
        $relPath = $relPath.Substring(2)
    }
    return $relPath
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
    
    $dirName = Split-Path $dirPath -Leaf
    return $excludedDirs -contains $dirName
}

# Function to check if a directory should be excluded
function Should-ExcludeDirectory {
    param (
        [string]$dirPath
    )
    
    foreach ($excluded in $excludedDirs) {
        if ($dirPath -match [regex]::Escape($excluded)) {
            return $true
        }
    }
    return $false
}

# Function to check if security-specific migration is needed
function Should-MigrateSecurity {
    param (
        [string]$content
    )
    
    foreach ($pattern in $authPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $authzPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $encryptionPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $sessionPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $auditPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $securityConfigPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    return $false
}
