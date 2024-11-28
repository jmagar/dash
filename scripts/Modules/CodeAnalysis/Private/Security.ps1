# Import configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

function Test-SecurityPreconditions {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [switch]$SkipContentCheck
    )
    
    try {
        # Get the full path and ensure it exists
        $item = Get-Item $Path -ErrorAction Stop
        $fullPath = $item.FullName
        
        # Validate path is within allowed boundaries
        $allowed = $false
        foreach ($allowedPath in $script:Config.security.allowedPaths) {
            $resolvedAllowedPath = Get-Item $allowedPath -ErrorAction SilentlyContinue
            if ($resolvedAllowedPath -and $fullPath.StartsWith($resolvedAllowedPath.FullName)) {
                $allowed = $true
                break
            }
        }
        
        if (-not $allowed) {
            throw "Path '$Path' is outside allowed boundaries"
        }
        
        # Skip content check if requested or if not a file
        if ($SkipContentCheck -or -not $item.PSIsContainer) {
            return $true
        }
        
        # Check if file should be excluded based on patterns
        $excludePatterns = $script:Config.fileSystem.excludePatterns
        $shouldExclude = $false
        
        foreach ($pattern in $excludePatterns) {
            if ($pattern.StartsWith("*")) {
                # Handle file extension/wildcard patterns
                if ($fullPath -like "*$pattern") {
                    $shouldExclude = $true
                    break
                }
            }
            elseif ($fullPath -match $pattern) {
                $shouldExclude = $true
                break
            }
        }
        
        if ($shouldExclude) {
            Write-Verbose "Path '$Path' matches exclude pattern"
            return $false
        }
        
        # Check for suspicious patterns if it's a file
        if ($item.PSIsContainer) {
            return $true
        }
        
        $content = Get-Content $fullPath -Raw
        foreach ($pattern in $script:Config.security.suspiciousPatterns) {
            if ($content -match $pattern) {
                Write-Warning "Suspicious pattern '$pattern' found in $Path"
                return $false
            }
        }
        
        return $true
    }
    catch {
        Write-ErrorLog $_
        return $false
    }
}

function Get-SecurityScore {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [hashtable]$Metrics
    )
    
    try {
        $score = 100
        
        # Check test coverage
        if ($Metrics.ContainsKey('testCoverage')) {
            if ($Metrics.testCoverage -lt 80) {
                $score -= 20
            }
            elseif ($Metrics.testCoverage -lt 60) {
                $score -= 40
            }
        }
        
        # Check complexity
        if ($Metrics.ContainsKey('complexity')) {
            if ($Metrics.complexity -gt $script:Config.complexity.maxAllowed) {
                $score -= 30
            }
            elseif ($Metrics.complexity -gt $script:Config.complexity.warning) {
                $score -= 15
            }
        }
        
        # Check for suspicious patterns
        $content = Get-Content $Path -Raw
        foreach ($pattern in $script:Config.security.suspiciousPatterns) {
            if ($content -match $pattern) {
                $score -= 25
                break
            }
        }
        
        return [Math]::Max(0, $score)
    }
    catch {
        Write-ErrorLog $_
        return 0
    }
}

Export-ModuleMember -Function Test-SecurityPreconditions, Get-SecurityScore
