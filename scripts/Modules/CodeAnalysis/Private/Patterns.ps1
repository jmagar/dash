# Import configuration
$script:Patterns = Get-Content "$PSScriptRoot/../Config/patterns.json" | ConvertFrom-Json

function Get-FileLanguage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Extension
    )
    
    switch -Regex ($Extension) {
        '\.go$' { return 'go' }
        '\.(?:js|jsx)$' { return 'javascript' }
        '\.(?:ts|tsx)$' { return 'typescript' }
        '\.py$' { return 'python' }
        '\.ps1$' { return 'powershell' }
        default { return 'unknown' }
    }
}

function Get-CodePatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$Language
    )
    
    try {
        $patternResults = @{}
        
        # Get language-specific patterns
        $extension = [System.IO.Path]::GetExtension($FilePath)
        $languagePatterns = $script:Patterns.languages.PSObject.Properties |
            Where-Object { $extension -match $_.Name } |
            Select-Object -First 1 -ExpandProperty Value
            
        if ($languagePatterns) {
            foreach ($pattern in $languagePatterns.PSObject.Properties) {
                $patternMatches = [regex]::Matches($Content, $pattern.Value)
                if ($patternMatches.Count -gt 0) {
                    $patternResults[$pattern.Name] = @($patternMatches | ForEach-Object {
                        @{
                            value = $_.Value
                            line = ($Content.Substring(0, $_.Index).Split("`n")).Count
                            index = $_.Index
                        }
                    })
                }
            }
        }
        
        # Get common patterns
        foreach ($category in $script:Patterns.common.PSObject.Properties) {
            $categoryName = $category.Name
            $patternResults[$categoryName] = @{}
            
            foreach ($pattern in $category.Value.PSObject.Properties) {
                $patternMatches = [regex]::Matches($Content, $pattern.Value)
                if ($patternMatches.Count -gt 0) {
                    $patternResults[$categoryName][$pattern.Name] = @($patternMatches | ForEach-Object {
                        @{
                            value = $_.Value
                            line = ($Content.Substring(0, $_.Index).Split("`n")).Count
                            index = $_.Index
                        }
                    })
                }
            }
        }
        
        return $patternResults
    }
    catch {
        Write-ErrorLog $_
        return @{}
    }
}

function Get-PatternMetrics {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Patterns
    )
    
    try {
        $metrics = @{
            totalPatterns = 0
            categories = @{}
            complexity = 0
            security = @{
                issues = 0
                severity = 'low'
            }
        }
        
        foreach ($category in $Patterns.Keys) {
            $categoryPatterns = $Patterns[$category]
            $metrics.categories[$category] = @{
                count = 0
                patterns = @{}
            }
            
            if ($categoryPatterns -is [hashtable]) {
                foreach ($pattern in $categoryPatterns.Keys) {
                    $count = $categoryPatterns[$pattern].Count
                    $metrics.categories[$category].patterns[$pattern] = $count
                    $metrics.categories[$category].count += $count
                    $metrics.totalPatterns += $count
                    
                    # Calculate complexity
                    if ($category -eq 'performance' -or $pattern -match 'nested|complex') {
                        $metrics.complexity += $count
                    }
                    
                    # Check security issues
                    if ($category -eq 'security') {
                        $metrics.security.issues += $count
                        if ($pattern -match 'critical|injection|unsafe') {
                            $metrics.security.severity = 'high'
                        }
                        elseif ($metrics.security.severity -ne 'high' -and $pattern -match 'warning|suspicious') {
                            $metrics.security.severity = 'medium'
                        }
                    }
                }
            }
            else {
                $metrics.categories[$category].count = $categoryPatterns.Count
                $metrics.totalPatterns += $categoryPatterns.Count
            }
        }
        
        return $metrics
    }
    catch {
        Write-ErrorLog $_
        return @{
            totalPatterns = 0
            categories = @{}
            complexity = 0
            security = @{ issues = 0; severity = 'unknown' }
        }
    }
}

Export-ModuleMember -Function Get-FileLanguage, Get-CodePatterns, Get-PatternMetrics
