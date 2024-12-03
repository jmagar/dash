# Configuration for RequestManager migration

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
$backupDir = "migrations/request-manager/backup"

# Import patterns to match
$importPatterns = @(
    "import\s*{\s*RequestManager\s*}\s*from\s*['"](\.{1,2}/)*utils/request/RequestManager['"]",
    "import\s*\*\s*as\s*RequestManager\s*from\s*['"](\.{1,2}/)*utils/request/RequestManager['"]",
    "import\s*RequestManager\s*from\s*['"](\.{1,2}/)*utils/request/RequestManager['"]"
)

# Usage patterns to match
$usagePatterns = @(
    "new\s+RequestManager\s*\(",
    "RequestManager\.createInstance\s*\(",
    "RequestManager\.initialize\s*\(",
    "RequestManager\.setup\s*\("
)

# HTTP request patterns
$requestPatterns = @(
    "get\s*\(",
    "post\s*\(",
    "put\s*\(",
    "delete\s*\(",
    "patch\s*\(",
    "head\s*\(",
    "options\s*\("
)

# Request configuration patterns
$configPatterns = @(
    "setBaseUrl\s*\(",
    "setHeaders\s*\(",
    "setTimeout\s*\(",
    "setRetry\s*\(",
    "setCredentials\s*\(",
    "setResponseType\s*\("
)

# Response handling patterns
$responsePatterns = @(
    "handleResponse\s*\(",
    "parseResponse\s*\(",
    "transformResponse\s*\(",
    "validateResponse\s*\(",
    "getResponseData\s*\("
)

# Middleware patterns
$middlewarePatterns = @(
    "addMiddleware\s*\(",
    "removeMiddleware\s*\(",
    "useMiddleware\s*\(",
    "applyMiddleware\s*\(",
    "clearMiddleware\s*\("
)

# Interceptor patterns
$interceptorPatterns = @(
    "addRequestInterceptor\s*\(",
    "addResponseInterceptor\s*\(",
    "removeInterceptor\s*\(",
    "clearInterceptors\s*\("
)

# Cache patterns
$cachePatterns = @(
    "setCacheStrategy\s*\(",
    "clearCache\s*\(",
    "getCached\s*\(",
    "invalidateCache\s*\(",
    "setCacheDuration\s*\("
)

# Error handling patterns
$errorPatterns = @(
    "handleError\s*\(",
    "onRequestError\s*\(",
    "onResponseError\s*\(",
    "setErrorHandler\s*\(",
    "retryOnError\s*\("
)

function Should-ExcludeDirectory {
    param (
        [string]$dirPath
    )
    
    foreach ($excluded in $excludedDirs) {
        if ($dirPath -match "[\\/]$excluded([\\/]|$)") {
            return $true
        }
    }
    return $false
}

function Should-MigrateRequest {
    param (
        [string]$content
    )
    
    # Check if the content contains any HTTP request-related patterns
    $patterns = @(
        "RequestManager",
        "axios",
        "fetch",
        "http\.",
        "https\.",
        "\.get\(",
        "\.post\(",
        "\.put\(",
        "\.delete\(",
        "XMLHttpRequest",
        "middleware",
        "interceptor",
        "headers",
        "response",
        "request"
    )
    
    foreach ($pattern in $patterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    return $false
}

function Get-RequestManagerImportPath {
    param (
        [string]$currentFile,
        [string]$requestManagerPath
    )
    
    $currentDir = Split-Path -Parent $currentFile
    $relativePath = Resolve-Path -Relative -Path $requestManagerPath -BasePath $currentDir
    
    # Convert Windows path to posix-style for TypeScript imports
    $relativePath = $relativePath -replace "\\", "/"
    
    # Remove .ts extension for the import
    $relativePath = $relativePath -replace "\.ts$", ""
    
    # Ensure the path starts with ./ or ../
    if (-not ($relativePath -match "^\.")) {
        $relativePath = "./$relativePath"
    }
    
    return $relativePath
}

# Export functions and variables
Export-ModuleMember -Function @(
    'Should-ExcludeDirectory',
    'Should-MigrateRequest',
    'Get-RequestManagerImportPath'
) -Variable @(
    'excludedDirs',
    'includePatterns',
    'backupDir',
    'importPatterns',
    'usagePatterns',
    'requestPatterns',
    'configPatterns',
    'responsePatterns',
    'middlewarePatterns',
    'interceptorPatterns',
    'cachePatterns',
    'errorPatterns'
)
