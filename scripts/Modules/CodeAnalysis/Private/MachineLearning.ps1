# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

function Get-PatternPredictions {
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
        
        Write-StructuredLog -Message "Starting pattern prediction analysis" -Level INFO
        
        # Initialize ML result
        $mlResult = @{
            predictions = @{
                patterns = @()
                confidence = 0.0
                threshold = 0.0
            }
            metrics = @{
                duration_ms = 0
                tokens_processed = 0
                memory_used_mb = 0
            }
            status = @{
                success = $true
                errors = @()
            }
        }
        
        # Load ML configuration
        $mlConfigPath = Join-Path $PSScriptRoot "../Config/ml.json"
        if (-not (Test-Path $mlConfigPath)) {
            throw "ML configuration not found: $mlConfigPath"
        }
        $mlConfig = Get-Content $mlConfigPath -Raw | ConvertFrom-Json
        
        # Get language-specific patterns
        $languagePatterns = $mlConfig.patterns.$Language
        if (-not $languagePatterns) {
            Write-StructuredLog -Message "No patterns defined for language: $Language" -Level WARN
            return $mlResult
        }
        
        $startTime = Get-Date
        
        # Tokenize content
        $tokens = $Content -split '\s+'
        if ($tokens.Count -gt $mlConfig.embeddings.maxTokens) {
            $tokens = $tokens[0..($mlConfig.embeddings.maxTokens - 1)]
        }
        
        # Analyze patterns
        $predictions = @()
        foreach ($patternName in $languagePatterns.PSObject.Properties.Name) {
            $pattern = $languagePatterns.$patternName
            $confidence = 0
            $evidence = @()
            
            # Check for pattern indicators
            foreach ($indicator in $pattern.indicators) {
                if ($Content -match [regex]::Escape($indicator)) {
                    $confidence += (1 / $pattern.indicators.Count)
                    $evidence += $indicator
                }
            }
            
            # Only include patterns that meet minimum confidence
            if ($confidence -ge $pattern.minConfidence) {
                $predictions += @{
                    pattern = $patternName
                    confidence = $confidence
                    evidence = $evidence -join ", "
                }
            }
        }
        
        # Update predictions
        $mlResult.predictions.patterns = $predictions
        if ($predictions.Count -gt 0) {
            $mlResult.predictions.confidence = ($predictions | 
                Measure-Object -Property confidence -Average).Average
        }
        $mlResult.predictions.threshold = $mlConfig.confidenceThresholds.medium
        
        # Update metrics
        $mlResult.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            tokens_processed = $tokens.Count
            memory_used_mb = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
        }
        
        Write-StructuredLog -Message "Pattern prediction completed" -Level INFO -Properties @{
            language = $Language
            patterns = $predictions.Count
            confidence = $mlResult.predictions.confidence
            tokens = $tokens.Count
        }
        
        return $mlResult
    }
    catch {
        Write-StructuredLog -Message "Failed to predict patterns: $_" -Level ERROR
        return @{
            predictions = @{
                patterns = @()
                confidence = 0.0
                threshold = 0.0
            }
            metrics = @{
                duration_ms = 0
                tokens_processed = 0
                memory_used_mb = 0
            }
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

Export-ModuleMember -Function Get-PatternPredictions
