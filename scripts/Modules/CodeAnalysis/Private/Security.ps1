# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

function Get-SecurityIssues {
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
        
        Write-StructuredLog -Message "Analyzing security issues" -Level INFO
        
        # Initialize result object
        $securityResult = @{
            issues = @()
            score = [int]100
            statistics = @{
                total = 0
                bySeverity = @{
                    critical = 0
                    high = 0
                    medium = 0
                    low = 0
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
        
        # Get security configuration
        $securityConfig = $config.config.security
        
        # Load security patterns from configuration file
        $securityPatternsPath = Join-Path $PSScriptRoot "../Config/security.json"
        if (-not (Test-Path $securityPatternsPath)) {
            throw "Security patterns configuration not found: $securityPatternsPath"
        }
        
        $securityPatterns = Get-Content $securityPatternsPath -Raw | ConvertFrom-Json
        
        # Get language-specific patterns
        $languagePatterns = $securityPatterns.patterns.$Language
        if (-not $languagePatterns) {
            Write-StructuredLog -Message "No security patterns defined for language: $Language" -Level WARN
            return $securityResult
        }
        
        # Check exclusions
        $shouldExclude = $false
        foreach ($exclusion in $securityPatterns.exclusions.files) {
            if ($Content -match [WildcardPattern]::new($exclusion).ToRegex()) {
                $shouldExclude = $true
                break
            }
        }
        
        if ($shouldExclude) {
            Write-StructuredLog -Message "File excluded from security analysis" -Level INFO
            return $securityResult
        }
        
        # Analyze patterns by severity
        foreach ($severity in @('critical', 'high', 'medium', 'low')) {
            $patterns = $languagePatterns.$severity
            if (-not $patterns) { continue }
            
            foreach ($pattern in $patterns) {
                $patternMatches = [regex]::Matches($Content, $pattern.regex)
                if ($patternMatches.Count -gt 0) {
                    foreach ($patternMatch in $patternMatches) {
                        # Skip if match is in excluded pattern
                        $isExcluded = $false
                        foreach ($exclusion in $securityPatterns.exclusions.patterns) {
                            if ($patternMatch.Value -match $exclusion) {
                                $isExcluded = $true
                                break
                            }
                        }
                        if ($isExcluded) { continue }
                        
                        $securityResult.issues += @{
                            name = $pattern.name
                            severity = $severity
                            impact = $securityConfig.thresholds.$severity
                            description = $pattern.description
                            remediation = $pattern.remediation
                            location = @{
                                index = $patternMatch.Index
                                length = $patternMatch.Length
                                value = $patternMatch.Value
                            }
                        }
                        
                        # Update statistics
                        $securityResult.statistics.total++
                        $securityResult.statistics.bySeverity[$severity]++
                        
                        # Update security score based on configured thresholds
                        $securityResult.score = [Math]::Max(0, $securityResult.score - $securityConfig.thresholds.$severity)
                    }
                }
            }
        }
        
        # Ensure score doesn't go below 0
        $securityResult.score = [Math]::Max(0, $securityResult.score)
        
        Write-StructuredLog -Message "Security analysis completed" -Level INFO -Properties @{
            language = $Language
            issues = $securityResult.statistics.total
            score = $securityResult.score
            severities = $securityResult.statistics.bySeverity | ConvertTo-Json -Compress
        }
        
        return $securityResult
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze security issues: $_" -Level ERROR
        return @{
            issues = @()
            score = [int]0
            statistics = @{
                total = 0
                bySeverity = @{
                    critical = 0
                    high = 0
                    medium = 0
                    low = 0
                }
            }
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

Export-ModuleMember -Function Get-SecurityIssues
