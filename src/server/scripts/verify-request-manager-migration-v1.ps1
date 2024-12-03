# Script to verify RequestManager migration
param (
    [switch]$Verbose
)

# Import configuration
. "$PSScriptRoot/request-manager-migration-config.ps1"

# Initialize verification results
$results = @{
    TotalFiles = 0
    FilesWithIssues = 0
    ImportIssues = 0
    UsageIssues = 0
    RequestIssues = 0
    ConfigIssues = 0
    ResponseIssues = 0
    MiddlewareIssues = 0
    InterceptorIssues = 0
    CacheIssues = 0
    ErrorIssues = 0
    IssuesList = @()
}

function Write-VerboseMessage {
    param([string]$Message)
    if ($Verbose) {
        Write-Host $Message
    }
}

function Test-ImportPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $importPatterns) {
        if ($content -match $pattern) {
            $issues += "Non-compliant import pattern found in $filePath"
            $results.ImportIssues++
        }
    }
    
    return $issues
}

function Test-UsagePatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $usagePatterns) {
        if ($content -match $pattern) {
            $issues += "Non-singleton instantiation pattern found in $filePath"
            $results.UsageIssues++
        }
    }
    
    return $issues
}

function Test-RequestPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $requestPatterns) {
        if ($content -match $pattern -and $content -notmatch "RequestManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton HTTP request pattern found in $filePath"
            $results.RequestIssues++
        }
    }
    
    return $issues
}

function Test-ConfigPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $configPatterns) {
        if ($content -match $pattern -and $content -notmatch "RequestManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton configuration pattern found in $filePath"
            $results.ConfigIssues++
        }
    }
    
    return $issues
}

function Test-ResponsePatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $responsePatterns) {
        if ($content -match $pattern -and $content -notmatch "RequestManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton response handling pattern found in $filePath"
            $results.ResponseIssues++
        }
    }
    
    return $issues
}

function Test-MiddlewarePatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $middlewarePatterns) {
        if ($content -match $pattern -and $content -notmatch "RequestManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton middleware pattern found in $filePath"
            $results.MiddlewareIssues++
        }
    }
    
    return $issues
}

function Test-InterceptorPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $interceptorPatterns) {
        if ($content -match $pattern -and $content -notmatch "RequestManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton interceptor pattern found in $filePath"
            $results.InterceptorIssues++
        }
    }
    
    return $issues
}

function Test-CachePatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $cachePatterns) {
        if ($content -match $pattern -and $content -notmatch "RequestManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton cache pattern found in $filePath"
            $results.CacheIssues++
        }
    }
    
    return $issues
}

function Test-ErrorPatterns {
    param (
        [string]$content,
        [string]$filePath
    )
    
    $issues = @()
    
    foreach ($pattern in $errorPatterns) {
        if ($content -match $pattern -and $content -notmatch "RequestManager\.getInstance\(\)\.$pattern") {
            $issues += "Non-singleton error handling pattern found in $filePath"
            $results.ErrorIssues++
        }
    }
    
    return $issues
}

function Process-File {
    param (
        [string]$filePath
    )
    
    try {
        $content = Get-Content -Path $filePath -Raw
        
        # Skip files that don't contain RequestManager
        if ($content -match "RequestManager") {
            Write-VerboseMessage "Checking $filePath"
            
            $importIssues = Test-ImportPatterns -content $content -filePath $filePath
            $usageIssues = Test-UsagePatterns -content $content -filePath $filePath
            $requestIssues = Test-RequestPatterns -content $content -filePath $filePath
            $configIssues = Test-ConfigPatterns -content $content -filePath $filePath
            $responseIssues = Test-ResponsePatterns -content $content -filePath $filePath
            $middlewareIssues = Test-MiddlewarePatterns -content $content -filePath $filePath
            $interceptorIssues = Test-InterceptorPatterns -content $content -filePath $filePath
            $cacheIssues = Test-CachePatterns -content $content -filePath $filePath
            $errorIssues = Test-ErrorPatterns -content $content -filePath $filePath
            
            $results.TotalFiles++
            
            $allIssues = @() + $importIssues + $usageIssues + $requestIssues + 
                        $configIssues + $responseIssues + $middlewareIssues + 
                        $interceptorIssues + $cacheIssues + $errorIssues
            
            if ($allIssues.Count -gt 0) {
                $results.FilesWithIssues++
                $results.IssuesList += @{
                    File = $filePath
                    Issues = $allIssues
                }
            }
        }
    }
    catch {
        $results.IssuesList += @{
            File = $filePath
            Issues = @("Error processing file: $_")
        }
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

# Start processing from script directory
Process-Directory -dirPath (Split-Path $PSScriptRoot -Parent)

# Print results
Write-Host "`nVerification Summary:"
Write-Host "Total files: $($results.TotalFiles)"
Write-Host "Files with issues: $($results.FilesWithIssues)"
Write-Host "Import issues: $($results.ImportIssues)"
Write-Host "Usage issues: $($results.UsageIssues)"
Write-Host "HTTP request issues: $($results.RequestIssues)"
Write-Host "Configuration issues: $($results.ConfigIssues)"
Write-Host "Response handling issues: $($results.ResponseIssues)"
Write-Host "Middleware issues: $($results.MiddlewareIssues)"
Write-Host "Interceptor issues: $($results.InterceptorIssues)"
Write-Host "Cache issues: $($results.CacheIssues)"
Write-Host "Error handling issues: $($results.ErrorIssues)"

if ($results.FilesWithIssues -gt 0) {
    Write-Host "`nIssues:"
    $results.IssuesList | ForEach-Object {
        Write-Host "`nFile: $($_.File)"
        Write-Host "Issues:"
        $_.Issues | ForEach-Object {
            Write-Host "  - $_"
        }
    }
}

Write-Host "`nVerification completed!"

# Return non-zero exit code if issues were found
exit $results.FilesWithIssues
