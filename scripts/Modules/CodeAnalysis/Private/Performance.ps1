# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

function Get-PerformanceMetrics {
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
        
        Write-StructuredLog -Message "Analyzing performance metrics" -Level INFO
        
        # Initialize performance result
        $perfResult = @{
            metrics = @{
                complexity = 0
                lines = 0
                functions = 0
            }
            score = [int]100  # Initialize with perfect score
            hotspots = @()
            recommendations = @()
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
        
        # Get metrics configuration
        $metricsConfig = $config.config.codeAnalysis.languages.$Language.metrics
        
        # Skip empty content
        if ([string]::IsNullOrWhiteSpace($Content)) {
            return $perfResult
        }
        
        # Calculate metrics based on language
        switch ($Language) {
            { $_ -in 'typescript', 'javascript' } {
                # Count lines
                $lines = $Content.Split("`n").Length
                $perfResult.metrics.lines = $lines
                
                # Count functions
                $functionMatches = [regex]::Matches($Content, '(?m)^(?:\s*export\s+)?(?:async\s+)?(?:function\s+\w+|\(\s*\w*\s*\)\s*=>|\w+\s*:\s*(?:async\s+)?function)')
                $perfResult.metrics.functions = $functionMatches.Count
                
                # Calculate cyclomatic complexity
                $complexity = 0
                $decisions = @(
                    'if\s*\(',
                    'else\s+if',
                    'while\s*\(',
                    'for\s*\(',
                    'switch\s*\(',
                    '&&',
                    '\|\|',
                    '\?',
                    'catch\s*\(',
                    '\.map\(',
                    '\.filter\(',
                    '\.reduce\(',
                    '\.forEach\('
                )
                
                foreach ($decision in $decisions) {
                    $complexity += [regex]::Matches($Content, $decision).Count
                }
                $perfResult.metrics.complexity = $complexity
                
                # Calculate performance score
                $complexityThreshold = $metricsConfig.complexityThreshold
                if ($complexity -gt $complexityThreshold) {
                    $perfResult.score = [Math]::Max(0, $perfResult.score - [Math]::Floor(($complexity - $complexityThreshold) * 5))
                    $perfResult.hotspots += @{
                        type = 'complexity'
                        value = $complexity
                        threshold = $complexityThreshold
                        recommendation = "Consider refactoring to reduce cyclomatic complexity"
                    }
                }
                
                # Check for large functions
                $functionLengthThreshold = $metricsConfig.functionLengthThreshold
                foreach ($match in $functionMatches) {
                    $functionContent = $Content.Substring($match.Index)
                    $functionLines = ($functionContent -split "`n" | Where-Object { $_ -match '\S' }).Length
                    if ($functionLines -gt $functionLengthThreshold) {
                        $perfResult.score = [Math]::Max(0, $perfResult.score - [Math]::Floor(($functionLines - $functionLengthThreshold) * 2))
                        $perfResult.hotspots += @{
                            type = 'function_length'
                            value = $functionLines
                            threshold = $functionLengthThreshold
                            recommendation = "Consider breaking down large functions into smaller ones"
                        }
                    }
                }
            }
            default {
                Write-Warning "Performance analysis not implemented for language: $Language"
            }
        }
        
        return $perfResult
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze performance: $_" -Level ERROR
        return @{
            metrics = @{
                complexity = 0
                lines = 0
                functions = 0
            }
            score = [int]0
            hotspots = @()
            recommendations = @()
            status = @{
                success = $false
                errors = @($_)
            }
        }
    }
}

Export-ModuleMember -Function Get-PerformanceMetrics
