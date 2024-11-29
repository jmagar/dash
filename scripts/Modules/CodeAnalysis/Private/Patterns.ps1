# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

function Get-CodePatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$Language
    )
    
    try {
        # Initialize logging if not already initialized
        if (-not $script:LogConfig) {
            Initialize-Logging | Out-Null
        }
        
        Write-StructuredLog -Message "Analyzing code patterns" -Level INFO
        
        # Initialize result object
        $patternResult = @{
            patterns = @{
                matched = @()
                suggested = @()
                statistics = @{
                    total = 0
                    byType = @{}
                }
            }
            status = @{
                success = $true
                errors = @()
            }
        }
        
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        # Get language-specific patterns
        $languagePatterns = $config.config.codeAnalysis.languages.$Language.patterns
        if (-not $languagePatterns.enabled) {
            Write-StructuredLog -Message "Pattern analysis disabled for language: $Language" -Level WARN
            return $patternResult
        }
        
        # Load patterns configuration
        $patternsConfigPath = Join-Path $PSScriptRoot "../$($languagePatterns.configPath)"
        if (-not (Test-Path $patternsConfigPath)) {
            throw "Patterns configuration not found: $patternsConfigPath"
        }
        
        $patternsConfig = Get-Content $patternsConfigPath -Raw | ConvertFrom-Json
        
        # Analyze patterns
        foreach ($pattern in $patternsConfig.patterns) {
            if ($pattern.language -eq $Language -or $pattern.language -eq '*') {
                $patternMatches = [regex]::Matches($Content, $pattern.regex)
                if ($patternMatches.Count -gt 0) {
                    $patternResult.patterns.matched += @{
                        name = $pattern.name
                        type = $pattern.type
                        matches = @($patternMatches | ForEach-Object {
                            @{
                                value = $_.Value
                                index = $_.Index
                                length = $_.Length
                            }
                        })
                        severity = $pattern.severity
                        description = $pattern.description
                    }
                    
                    # Update statistics
                    if (-not $patternResult.patterns.statistics.byType.ContainsKey($pattern.type)) {
                        $patternResult.patterns.statistics.byType[$pattern.type] = 0
                    }
                    $patternResult.patterns.statistics.byType[$pattern.type] += $patternMatches.Count
                    $patternResult.patterns.statistics.total += $patternMatches.Count
                }
            }
        }
        
        # Add pattern suggestions
        if ($patternResult.patterns.matched.Count -gt 0) {
            foreach ($match in $patternResult.patterns.matched) {
                if ($match.severity -in @('high', 'medium')) {
                    $patternResult.patterns.suggested += @{
                        pattern = $match.name
                        type = $match.type
                        suggestion = switch ($match.type) {
                            'security' { "Consider reviewing security implications" }
                            'performance' { "Consider optimizing for better performance" }
                            'maintainability' { "Consider refactoring for better maintainability" }
                            default { "Consider reviewing this pattern" }
                        }
                    }
                }
            }
        }
        
        Write-StructuredLog -Message "Pattern analysis completed" -Level INFO -Properties @{
            language = $Language
            matches = $patternResult.patterns.statistics.total
            types = $patternResult.patterns.statistics.byType.Keys -join ','
        }
        
        return $patternResult
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze patterns: $_" -Level ERROR
        return @{
            patterns = @{
                matched = @()
                suggested = @()
                statistics = @{
                    total = 0
                    byType = @{}
                }
            }
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

Export-ModuleMember -Function Get-CodePatterns
