# Common configuration for DatabaseManager migration scripts

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
    "import\s*{\s*DatabaseManager\s*}\s*from\s*['"](\.{1,2}/)*utils/database/DatabaseManager['"]",
    "import\s*\*\s*as\s*DatabaseManager\s*from\s*['"](\.{1,2}/)*utils/database/DatabaseManager['"]",
    "import\s*DatabaseManager\s*from\s*['"](\.{1,2}/)*utils/database/DatabaseManager['"]"
)

# Usage patterns to identify DatabaseManager instantiation
$usagePatterns = @(
    "new\s+DatabaseManager\s*\(",
    "DatabaseManager\.createInstance\s*\(",
    "DatabaseManager\.initialize\s*\(",
    "DatabaseManager\.setup\s*\("
)

# Connection management patterns
$connectionPatterns = @(
    "connect\s*\(",
    "disconnect\s*\(",
    "reconnect\s*\(",
    "isConnected\s*\(",
    "getConnectionStatus\s*\(",
    "setConnectionConfig\s*\("
)

# Query execution patterns
$queryPatterns = @(
    "executeQuery\s*\(",
    "executeBatch\s*\(",
    "executeStoredProcedure\s*\(",
    "prepareStatement\s*\(",
    "executeTransaction\s*\("
)

# Transaction management patterns
$transactionPatterns = @(
    "beginTransaction\s*\(",
    "commitTransaction\s*\(",
    "rollbackTransaction\s*\(",
    "setIsolationLevel\s*\(",
    "getTransactionStatus\s*\("
)

# Pool management patterns
$poolPatterns = @(
    "createPool\s*\(",
    "closePool\s*\(",
    "getPoolConnection\s*\(",
    "releaseConnection\s*\(",
    "setPoolConfig\s*\(",
    "getPoolStatus\s*\("
)

# Migration patterns
$migrationPatterns = @(
    "runMigration\s*\(",
    "rollbackMigration\s*\(",
    "getMigrationStatus\s*\(",
    "createMigration\s*\(",
    "listMigrations\s*\("
)

# Error handling patterns
$errorPatterns = @(
    "handleError\s*\(",
    "onConnectionError\s*\(",
    "onQueryError\s*\(",
    "onTransactionError\s*\(",
    "setErrorHandler\s*\("
)

# Database-specific patterns to identify and migrate
$databasePatterns = @(
    $connectionPatterns,
    $queryPatterns,
    $transactionPatterns,
    $poolPatterns,
    $migrationPatterns,
    $errorPatterns
)

# Database event patterns
$databaseEventPatterns = @(
    "onConnectionError\s*\(",
    "onPoolError\s*\(",
    "onTransactionComplete\s*\(",
    "onQueryError\s*\("
)

# Prisma-specific patterns
$prismaPatterns = @(
    "prisma\.(.*?)\.findUnique",
    "prisma\.(.*?)\.findMany",
    "prisma\.(.*?)\.create",
    "prisma\.(.*?)\.update",
    "prisma\.(.*?)\.delete",
    "prisma\.(.*?)\.upsert",
    "\$transaction\s*\("
)

# Backup directory for modified files
$backupDir = "migrations/database-manager/backup"

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
    
    $backSteps = $fromParts.Length - $commonPrefixLength
    $forwardSteps = $toParts.Length - $commonPrefixLength
    
    $relativePath = ""
    if ($backSteps -gt 0) {
        $relativePath = "../" * $backSteps
    }
    
    if ($forwardSteps -gt 0) {
        $relativePath += $toParts[$commonPrefixLength..($toParts.Length-1)] -join "/"
    }
    
    if ($relativePath -eq "") {
        $relativePath = "."
    }
    
    return $relativePath
}

# Function to get DatabaseManager import path
function Get-DatabaseManagerImportPath {
    param (
        [string]$currentFile,
        [string]$databaseManagerPath
    )
    
    $relativePath = Get-RelativePath -from (Split-Path $currentFile -Parent) -to (Split-Path $databaseManagerPath -Parent)
    return $relativePath.TrimEnd("/") + "/DatabaseManager"
}

# Function to check if file needs database-specific migration
function Should-MigrateDatabaseSpecific {
    param (
        [string]$content
    )
    
    foreach ($pattern in $databasePatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $databaseEventPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    foreach ($pattern in $prismaPatterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    
    return $false
}
