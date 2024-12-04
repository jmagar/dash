# Shared configuration for logger migration scripts
$config = @{
    RootDir = "."
    ManagerName = "LoggingManager"
    ManagerPath = "src/server/utils/logging/LoggingManager"
    OldImportPattern = './utils/logger'
    ExcludeDirs = @(
        "node_modules",
        "dist",
        "build",
        "coverage",
        "__tests__",
        "backup",
        ".codeanalysis",
        "backups",
        ".backup",
        ".git",
        "temp",
        "tmp"
    )
    BackupDir = "./backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    ImportPatterns = @(
        'import\s*{\s*LoggingManager\s*}\s*from\s*["''](\.{1,2}/)*utils/logging/LoggingManager["'']',
        'import\s*\*\s*as\s*LoggingManager\s*from\s*["''](\.{1,2}/)*utils/logging/LoggingManager["'']',
        'import\s*LoggingManager\s*from\s*["''](\.{1,2}/)*utils/logging/LoggingManager["'']'
    )
    UsagePatterns = @(
        "new\s+LoggingManager\s*\(",
        "LoggingManager\.createInstance\s*\(",
        "LoggingManager\.initialize\s*\(",
        "LoggingManager\.setup\s*\("
    )
    LoggingPatterns = @(
        "log\s*\(",
        "debug\s*\(",
        "info\s*\(",
        "warn\s*\(",
        "error\s*\(",
        "fatal\s*\(",
        "trace\s*\(",
        "verbose\s*\("
    )
    LogConfigPatterns = @(
        "setLogLevel\s*\(",
        "getLogLevel\s*\(",
        "setLogFormat\s*\(",
        "addLogTransport\s*\(",
        "removeLogTransport\s*\(",
        "configureTransport\s*\("
    )
    TransportPatterns = @(
        "addConsoleTransport\s*\(",
        "addFileTransport\s*\(",
        "addStreamTransport\s*\("
    )
}

# Helper function for verbose logging
function Write-VerboseLog {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    if ($Verbose) {
        Write-Host $Message -ForegroundColor $Color
    }
}

# Helper function to get relative path between two paths
function Get-RelativePath {
    param(
        [string]$from,
        [string]$to
    )
    
    # Convert paths to absolute paths and normalize separators
    $fromPath = [System.IO.Path]::GetFullPath($from).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
    $toPath = [System.IO.Path]::GetFullPath($to).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
    
    # Split paths into segments
    $fromSegments = $fromPath.Split([System.IO.Path]::DirectorySeparatorChar)
    $toSegments = $toPath.Split([System.IO.Path]::DirectorySeparatorChar)
    
    # Find common prefix
    $commonPrefixLength = 0
    $minLength = [Math]::Min($fromSegments.Length, $toSegments.Length)
    
    for ($i = 0; $i -lt $minLength; $i++) {
        if ($fromSegments[$i] -eq $toSegments[$i]) {
            $commonPrefixLength++
        }
        else {
            break
        }
    }
    
    # Build relative path
    $relativePath = ""
    
    # Add "../" for each level we need to go up
    for ($i = $commonPrefixLength; $i -lt $fromSegments.Length; $i++) {
        $relativePath += "../"
    }
    
    # Add path to target
    for ($i = $commonPrefixLength; $i -lt $toSegments.Length; $i++) {
        $relativePath += $toSegments[$i]
        if ($i -lt $toSegments.Length - 1) {
            $relativePath += "/"
        }
    }
    
    # Handle empty relative path (same directory)
    if ($relativePath -eq "") {
        $relativePath = "./"
    }
    
    return $relativePath
}

# Calculate relative path for imports
function Get-LoggingManagerImportPath {
    param([string]$filePath)
    
    # Convert to Unix-style paths for consistency
    $filePath = $filePath.Replace('\', '/')
    $fileDir = Split-Path $filePath -Parent
    
    # Calculate relative path from file to LoggingManager
    $relativePath = Get-RelativePath -from $fileDir -to $config.ManagerPath
    
    # Ensure path starts with ./ or ../
    if (-not $relativePath.StartsWith('.')) {
        $relativePath = "./$relativePath"
    }
    
    return $relativePath
}

# Update import statements
function Update-ImportStatements {
    param(
        [string]$content,
        [string]$filePath
    )

    # Get the correct relative import path
    $importPath = Get-LoggingManagerImportPath -filePath $filePath
    
    # Replace existing LoggingManager imports with the correct path
    if ($content -match "import.*LoggingManager.*from") {
        $content = $content -replace "import\s*{\s*LoggingManager\s*}\s*from\s*['""].*?['""]", 
            "import { LoggingManager } from '$importPath'"
    }
    # Add LoggingManager import if it doesn't exist but logger is used
    elseif ($content -match "logger\.(info|error|warn|debug)\(") {
        $content = "import { LoggingManager } from '$importPath'`n$content"
    }

    return $content
}

# Helper function to get TypeScript files
function Get-TypeScriptFiles {
    param(
        [string]$SingleFile
    )
    
    if ($SingleFile) {
        if (Test-Path $SingleFile) {
            return Get-Item $SingleFile
        }
        Write-Error "Specified file not found: $SingleFile"
        return @()
    }
    
    # Get all TypeScript files first
    $allFiles = Get-ChildItem -Path $config.RootDir -Recurse -File -Include "*.ts","*.tsx"
    
    # Filter out excluded directories more strictly
    $filteredFiles = $allFiles | Where-Object {
        $filePath = $_.FullName
        $exclude = $false
        
        foreach ($dir in $config.ExcludeDirs) {
            # Check if file path contains the excluded directory
            if ($filePath -match "[\\/]$dir[\\/]" -or $filePath -match "[\\/]$dir$") {
                $exclude = $true
                break
            }
        }
        
        return -not $exclude
    }
    
    return $filteredFiles
}
