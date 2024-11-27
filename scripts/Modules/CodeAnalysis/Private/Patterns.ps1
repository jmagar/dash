using namespace System.Management.Automation.Language

# Import configuration and patterns
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json
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
        # Try to get from cache first
        $cacheKey = New-CacheKey -FilePath $FilePath -AnalysisType "Patterns"
        $cachedResults = Get-CacheItem -Key $cacheKey
        if ($cachedResults) {
            Write-Verbose "Retrieved pattern results from cache for $FilePath"
            return $cachedResults
        }
        
        $patternResults = @{}
        
        # Get AST-based patterns
        $astResult = Get-AstParser -Language $Language -Content $Content
        if ($astResult -and $astResult.ast) {
            # Get metrics for indexing and analysis
            $astMetrics = Get-AstMetrics -Ast $astResult.ast -Language $Language
            
            # Add file to index with metrics for future reference
            $indexResult = Add-FileToIndex -FilePath $FilePath -Content $Content -Metrics $astMetrics -Language $Language
            if (-not $indexResult) {
                Write-Warning "Failed to index file $FilePath"
            }
            
            # Use AST patterns based on language
            switch ($Language) {
                'powershell' {
                    $astPatterns = Get-PowerShellAstPatterns -Ast $astResult.ast
                    foreach ($pattern in $astPatterns.GetEnumerator()) {
                        $patternResults[$pattern.Key] = $pattern.Value
                    }
                }
                'python' {
                    if ($astResult.success) {
                        $astPatterns = Get-PythonAstPatterns -AstDump $astResult.ast
                        foreach ($pattern in $astPatterns.GetEnumerator()) {
                            $patternResults[$pattern.Key] = $pattern.Value
                        }
                    }
                }
                'javascript' {
                    if ($astResult.success) {
                        $astPatterns = Get-JavaScriptAstPatterns -AstJson $astResult.ast
                        foreach ($pattern in $astPatterns.GetEnumerator()) {
                            $patternResults[$pattern.Key] = $pattern.Value
                        }
                    }
                }
            }
        }
        
        # Get ML-based pattern predictions
        $mlPredictions = Get-PredictedPatterns -Content $Content -Language $Language
        foreach ($prediction in $mlPredictions) {
            if (-not $patternResults[$prediction.pattern]) {
                $patternResults[$prediction.pattern] = @()
            }
            
            # Find actual occurrences of the predicted pattern
            $pattern = $script:Patterns.languages.$Language.patterns.$($prediction.pattern)
            if ($pattern) {
                $patternMatches = [regex]::Matches($Content, $pattern.regex)
                if ($patternMatches.Count -gt 0) {
                    $patternResults[$prediction.pattern] += @($patternMatches | ForEach-Object {
                        @{
                            value = $_.Value
                            line = ($Content.Substring(0, $_.Index).Split("`n")).Count
                            index = $_.Index
                            confidence = $prediction.confidence
                            type = $pattern.type
                        }
                    })
                }
            }
        }
        
        # Add feedback for ML training
        foreach ($pattern in $patternResults.GetEnumerator()) {
            foreach ($occurrence in $pattern.Value) {
                Add-PatternFeedback -Content $occurrence.value `
                                  -Pattern $pattern.Key `
                                  -Language $Language `
                                  -IsCorrect $true
            }
        }
        
        # Cache the results
        Set-CacheItem -Key $cacheKey -Data $patternResults
        
        return $patternResults
    }
    catch {
        Write-Error "Failed to analyze patterns in $FilePath : $_"
        return @{}
    }
}

function Get-PowerShellAstPatterns {
    [CmdletBinding()]
    param([Parameter(Mandatory)][object]$Ast)
    
    $patterns = @{}
    
    # Define AST-based patterns
    $astPatterns = @{
        'security.injection.invoke' = {
            param($node)
            $node -is [CommandAst] -and
            $node.CommandElements[0].Value -eq 'Invoke-Expression'
        }
        'security.credentials.plain' = {
            param($node)
            $node -is [CommandParameterAst] -and
            $node.ParameterName -match '^pass(word)?$' -and
            $node.Argument -is [StringConstantExpressionAst]
        }
        'performance.pipeline.measure' = {
            param($node)
            $node -is [PipelineAst] -and
            $node.PipelineElements.Count -gt 5
        }
        'style.scriptblock.empty' = {
            param($node)
            $node -is [ScriptBlockExpressionAst] -and
            $node.ScriptBlock.EndBlock.Statements.Count -eq 0
        }
    }
    
    # Find patterns in AST
    foreach ($patternName in $astPatterns.Keys) {
        $patterns[$patternName] = @()
        $visitor = {
            param($node)
            
            if (& $astPatterns[$patternName] $node) {
                $patterns[$patternName] += @{
                    value = $node.Extent.Text
                    line = $node.Extent.StartLineNumber
                    index = $node.Extent.StartOffset
                    confidence = 1.0
                    type = 'ast'
                }
            }
            return $true
        }
        
        $Ast.Visit($visitor)
    }
    
    return $patterns
}

function Get-PythonAstPatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$AstDump
    )
    
    $patterns = @{}
    
    # Parse the AST dump and look for patterns
    # Example patterns:
    if ($AstDump -match 'Exec\(') {
        $patterns['security.injection.exec'] = @{
            value = $matches[0]
            line = 0  # We'd need to parse the AST dump more carefully to get the line
            index = $matches.Index
            confidence = 1.0
            type = 'ast'
        }
    }
    
    return $patterns
}

function Get-JavaScriptAstPatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$AstJson
    )
    
    $patterns = @{}
    
    # Recursively search the AST JSON for patterns
    function Search-Node {
        param($Node)
        
        if ($Node.type -eq 'CallExpression' -and
            $Node.callee.type -eq 'Identifier' -and
            $Node.callee.name -eq 'eval') {
            
            $patterns['security.injection.eval'] += @{
                value = 'eval'
                line = $Node.loc.start.line
                index = $Node.range[0]
                confidence = 1.0
                type = 'ast'
            }
        }
        
        # Recurse through properties
        foreach ($prop in $Node.PSObject.Properties) {
            if ($prop.Value -is [System.Management.Automation.PSCustomObject]) {
                Search-Node $prop.Value
            }
            elseif ($prop.Value -is [array]) {
                foreach ($item in $prop.Value) {
                    if ($item -is [System.Management.Automation.PSCustomObject]) {
                        Search-Node $item
                    }
                }
            }
        }
    }
    
    Search-Node $AstJson
    return $patterns
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
                severity = 'unknown'
            }
        }
        
        foreach ($pattern in $Patterns.GetEnumerator()) {
            $metrics.totalPatterns += $pattern.Value.Count
            
            # Calculate weighted metrics based on ML confidence
            $avgConfidence = ($pattern.Value | Measure-Object -Property confidence -Average).Average
            
            if ($pattern.Key -match 'security|vulnerability|exploit') {
                $metrics.security.issues += [Math]::Round($pattern.Value.Count * $avgConfidence)
            }
            elseif ($pattern.Key -match 'complexity|cyclomatic|cognitive') {
                $metrics.complexity += [Math]::Round(($pattern.Value | 
                    Measure-Object -Property { [int]$_.value } -Sum).Sum * $avgConfidence)
            }
            
            $category = switch -Regex ($pattern.Key) {
                'security|auth|crypto' { 'Security' }
                'performance|memory|cpu' { 'Performance' }
                'style|format|lint' { 'Style' }
                'bug|error|exception' { 'Bugs' }
                default { 'Other' }
            }
            
            if (-not $metrics.categories[$category]) {
                $metrics.categories[$category] = @{
                    count = 0
                    confidence = 0
                }
            }
            
            $metrics.categories[$category].count += $pattern.Value.Count
            $metrics.categories[$category].confidence = [Math]::Max(
                $metrics.categories[$category].confidence,
                $avgConfidence
            )
        }
        
        # Set overall security severity
        $metrics.security.severity = switch ($metrics.security.issues) {
            { $_ -gt 10 } { 'high' }
            { $_ -gt 5 } { 'medium' }
            { $_ -gt 0 } { 'low' }
            default { 'none' }
        }
        
        return $metrics
    }
    catch {
        Write-Error "Failed to calculate pattern metrics: $_"
        return @{
            totalPatterns = 0
            categories = @{}
            complexity = 0
            security = @{ issues = 0; severity = 'unknown' }
        }
    }
}

# Export functions
Export-ModuleMember -Function Get-FileLanguage, Get-CodePatterns, Get-PatternMetrics
