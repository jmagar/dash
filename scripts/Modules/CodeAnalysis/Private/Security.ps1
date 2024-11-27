# Import configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/metrics.json" | ConvertFrom-Json

function Test-SecurityPreconditions {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [switch]$SkipContentCheck
    )
    
    try {
        # Validate path is within allowed boundaries
        $fullPath = Resolve-Path $Path -ErrorAction Stop
        $allowed = $false
        foreach ($allowedPath in $script:Config.security.allowedPaths) {
            $resolvedAllowedPath = Resolve-Path $allowedPath -ErrorAction SilentlyContinue
            if ($resolvedAllowedPath -and $fullPath.Path.StartsWith($resolvedAllowedPath)) {
                $allowed = $true
                break
            }
        }
        
        if (-not $allowed) {
            throw "Path '$Path' is outside allowed boundaries"
        }
        
        # Skip content check if requested or if file doesn't exist
        if ($SkipContentCheck -or -not (Test-Path $Path -PathType Leaf)) {
            return $true
        }
        
        # Check for suspicious patterns
        $content = Get-Content $Path -Raw
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
