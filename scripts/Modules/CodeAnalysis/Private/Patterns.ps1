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
        
        # Get patterns for Cascade optimization
        $cascadePatterns = $script:Patterns.cascadeOptimization.patternTypes
        
        # Get AST-based patterns with Cascade metadata
        $astResult = Get-AstParser -Language $Language -Content $Content
        if ($astResult -and $astResult.ast) {
            # Get metrics for indexing and analysis
            $astMetrics = Get-AstMetrics -Ast $astResult.ast -Language $Language
            
            # Add file to index with metrics for future reference
            $indexResult = Add-FileToIndex -FilePath $FilePath -Content $Content -Metrics $astMetrics -Language $Language
            if (-not $indexResult) {
                Write-Warning "Failed to index file $FilePath"
            }
            
            # Use AST patterns based on language with Cascade metadata
            switch ($Language) {
                'powershell' {
                    $astPatterns = Get-PowerShellAstPatterns -Ast $astResult.ast
                    foreach ($pattern in $astPatterns.GetEnumerator()) {
                        $patternType = ($pattern.Key -split '\.')[0]
                        $cascadeInfo = $cascadePatterns[$patternType]
                        
                        $patternResults[$pattern.Key] = $pattern.Value | ForEach-Object {
                            $_ | Add-Member -NotePropertyName 'cascadeMetadata' -NotePropertyValue @{
                                priority = $cascadeInfo.priority
                                compatibility = $cascadeInfo.cascadeCompatibility
                                automation = $cascadeInfo.automationLevel
                                toolMapping = $script:Patterns.cascadeOptimization.toolMappings | 
                                    Where-Object { $pattern.Key -match $_.patterns[0] } |
                                    Select-Object -First 1
                            } -PassThru
                        }
                    }
                }
                'python' {
                    if ($astResult.success) {
                        $astPatterns = Get-PythonAstPatterns -AstDump $astResult.ast
                        foreach ($pattern in $astPatterns.GetEnumerator()) {
                            $patternType = ($pattern.Key -split '\.')[0]
                            $cascadeInfo = $cascadePatterns[$patternType]
                            
                            $patternResults[$pattern.Key] = $pattern.Value | ForEach-Object {
                                $_ | Add-Member -NotePropertyName 'cascadeMetadata' -NotePropertyValue @{
                                    priority = $cascadeInfo.priority
                                    compatibility = $cascadeInfo.cascadeCompatibility
                                    automation = $cascadeInfo.automationLevel
                                    toolMapping = $script:Patterns.cascadeOptimization.toolMappings | 
                                        Where-Object { $pattern.Key -match $_.patterns[0] } |
                                        Select-Object -First 1
                                } -PassThru
                            }
                        }
                    }
                }
                'javascript' {
                    if ($astResult.success) {
                        $astPatterns = Get-JavaScriptAstPatterns -AstJson $astResult.ast
                        foreach ($pattern in $astPatterns.GetEnumerator()) {
                            $patternType = ($pattern.Key -split '\.')[0]
                            $cascadeInfo = $cascadePatterns[$patternType]
                            
                            $patternResults[$pattern.Key] = $pattern.Value | ForEach-Object {
                                $_ | Add-Member -NotePropertyName 'cascadeMetadata' -NotePropertyValue @{
                                    priority = $cascadeInfo.priority
                                    compatibility = $cascadeInfo.cascadeCompatibility
                                    automation = $cascadeInfo.automationLevel
                                    toolMapping = $script:Patterns.cascadeOptimization.toolMappings | 
                                        Where-Object { $pattern.Key -match $_.patterns[0] } |
                                        Select-Object -First 1
                                } -PassThru
                            }
                        }
                    }
                }
            }
        }
        
        # Get ML-based pattern predictions with Cascade metadata
        $mlPredictions = Get-PredictedPatterns -Content $Content -Language $Language
        foreach ($prediction in $mlPredictions) {
            if (-not $patternResults[$prediction.pattern]) {
                $patternResults[$prediction.pattern] = @()
            }
            
            $patternType = ($prediction.pattern -split '\.')[0]
            $cascadeInfo = $cascadePatterns[$patternType]
            
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
                            cascadeMetadata = @{
                                priority = $cascadeInfo.priority
                                compatibility = $cascadeInfo.cascadeCompatibility
                                automation = $cascadeInfo.automationLevel
                                toolMapping = $script:Patterns.cascadeOptimization.toolMappings | 
                                    Where-Object { $prediction.pattern -match $_.patterns[0] } |
                                    Select-Object -First 1
                                action = $pattern.cascadeAction
                            }
                        }
                    })
                }
            }
        }
        
        # Sort patterns by Cascade priority
        $patternResults = $patternResults.GetEnumerator() | Sort-Object {
            $cascadeInfo = $cascadePatterns[($_.Key -split '\.')[0]]
            $cascadeInfo.priority
        } | ForEach-Object { @{$_.Key = $_.Value} }
        
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
    
    # Visit each node in the AST
    $Ast.Visit([ScriptBlockAst]{
        param($node)
        
        # Check for command patterns
        if ($node -is [CommandAst]) {
            $commandName = $node.GetCommandName()
            if ($commandName) {
                $patterns[$commandName] = @{
                    Type = "Command"
                    Location = $node.Extent
                    Metadata = @{
                        Parameters = $node.CommandElements | Where-Object { $_ -is [CommandParameterAst] } | ForEach-Object { $_.ParameterName }
                    }
                }
            }
        }
        
        # Check for variable patterns
        elseif ($node -is [VariableExpressionAst]) {
            $varName = $node.VariablePath.UserPath
            if (-not $patterns.ContainsKey($varName)) {
                $patterns[$varName] = @{
                    Type = "Variable"
                    Location = $node.Extent
                    Metadata = @{
                        Scope = if ($node.VariablePath.IsScript) { "Script" } else { "Local" }
                    }
                }
            }
        }
        
        # Check for function definitions
        elseif ($node -is [FunctionDefinitionAst]) {
            $patterns[$node.Name] = @{
                Type = "Function"
                Location = $node.Extent
                Metadata = @{
                    Parameters = $node.Parameters.Name.VariablePath.UserPath
                    HasBegin = $null -ne $node.Body.BeginBlock
                    HasProcess = $null -ne $node.Body.ProcessBlock
                    HasEnd = $null -ne $node.Body.EndBlock
                }
            }
        }
        
        return $true  # Continue visiting nodes
    })
    
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