using namespace System.Management.Automation.Language

# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/DataManagement.ps1

# Import configuration and patterns
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json
$script:Patterns = Get-Content "$PSScriptRoot/../Config/patterns.json" | ConvertFrom-Json

function New-PatternResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [string]$Language,
        [Parameter()]
        [string]$Operation = "detection"
    )
    
    return @{
        metadata = @{
            path = $FilePath
            language = $Language
            operation = $Operation
            timestamp = Get-Date -Format "o"
            version = "1.0"
        }
        file = @{
            path = $FilePath
            language = $Language
            size = (Get-Item $FilePath).Length
            last_modified = (Get-Item $FilePath).LastWriteTime.ToString('o')
            hash = (Get-FileHash $FilePath).Hash
        }
        patterns = @{
            detected = @{}
            statistics = @{
                total = 0
                by_type = @{}
                by_priority = @{}
                by_compatibility = @{}
            }
            suggestions = @()
        }
        cascade = @{
            compatibility = "unknown"
            automation_level = "none"
            priority = "low"
            score = 0.0
        }
        metrics = @{
            duration_ms = 0
            memory_mb = 0
            patterns_analyzed = 0
            nodes_visited = 0
        }
        status = @{
            success = $true
            parsed = $false
            warnings = @()
            errors = @()
        }
    }
}

function Get-FileLanguage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Extension
    )
    
    try {
        Write-StructuredLog -Message "Detecting file language" -Level INFO
        
        $language = switch -Regex ($Extension) {
            '\.go$' { 'go' }
            '\.(?:js|jsx)$' { 'javascript' }
            '\.(?:ts|tsx)$' { 'typescript' }
            '\.py$' { 'python' }
            '\.ps1$' { 'powershell' }
            default { 'unknown' }
        }
        
        Write-StructuredLog -Message "Language detected" -Level INFO -Properties @{
            extension = $Extension
            language = $language
        }
        
        return $language
    }
    catch {
        Write-StructuredLog -Message "Failed to detect language: $_" -Level ERROR
        return 'unknown'
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
        Write-StructuredLog -Message "Analyzing patterns" -Level INFO
        $startTime = Get-Date
        
        # Create new pattern result
        $result = New-PatternResult -FilePath $FilePath -Language $Language
        
        # Get patterns for Cascade optimization
        $cascadePatterns = $script:Patterns.cascadeOptimization.patternTypes
        
        # Get AST-based patterns
        $astResult = Get-AstParser -Language $Language -Content $Content -FilePath $FilePath
        if ($astResult.success) {
            $result.status.parsed = $true
            Write-StructuredLog -Message "Successfully parsed AST" -Level INFO
            
            # Process AST patterns based on language
            switch ($Language.ToLower()) {
                'powershell' {
                    $astPatterns = Get-PowerShellAstPatterns -Ast $astResult.ast
                    foreach ($pattern in $astPatterns.patterns.GetEnumerator()) {
                        $patternType = ($pattern.Key -split '\.')[0]
                        $cascadeInfo = $cascadePatterns[$patternType]
                        
                        if ($cascadeInfo) {
                            $result.patterns.detected[$pattern.Key] = @{
                                type = $patternType
                                count = $pattern.Value.Count
                                locations = $pattern.Value.Location | ForEach-Object {
                                    @{
                                        start_line = $_.StartLineNumber
                                        end_line = $_.EndLineNumber
                                        text = $_.Text
                                        context = Get-LineContext -Content $Content -LineNumber $_.StartLineNumber
                                    }
                                }
                                metadata = @{
                                    priority = $cascadeInfo.priority
                                    compatibility = $cascadeInfo.cascadeCompatibility
                                    automation = $cascadeInfo.automationLevel
                                    category = $cascadeInfo.category
                                    impact = $cascadeInfo.impact
                                }
                            }
                            
                            # Update statistics
                            $result.patterns.statistics.total += $pattern.Value.Count
                            
                            # Update by_type statistics
                            if (-not $result.patterns.statistics.by_type[$patternType]) {
                                $result.patterns.statistics.by_type[$patternType] = 0
                            }
                            $result.patterns.statistics.by_type[$patternType] += $pattern.Value.Count
                            
                            # Update by_priority statistics
                            if (-not $result.patterns.statistics.by_priority[$cascadeInfo.priority]) {
                                $result.patterns.statistics.by_priority[$cascadeInfo.priority] = 0
                            }
                            $result.patterns.statistics.by_priority[$cascadeInfo.priority] += $pattern.Value.Count
                            
                            # Update by_compatibility statistics
                            if (-not $result.patterns.statistics.by_compatibility[$cascadeInfo.cascadeCompatibility]) {
                                $result.patterns.statistics.by_compatibility[$cascadeInfo.cascadeCompatibility] = 0
                            }
                            $result.patterns.statistics.by_compatibility[$cascadeInfo.cascadeCompatibility] += $pattern.Value.Count
                            
                            # Update Cascade compatibility
                            if ($cascadeInfo.cascadeCompatibility -eq "high") {
                                $result.cascade.compatibility = "high"
                                if ($cascadeInfo.priority -eq "high") {
                                    $result.cascade.priority = "high"
                                }
                            }
                            
                            # Add suggestions if available
                            if ($cascadeInfo.suggestions) {
                                foreach ($suggestion in $cascadeInfo.suggestions) {
                                    $result.patterns.suggestions += @{
                                        pattern = $pattern.Key
                                        type = $patternType
                                        text = $suggestion.text
                                        priority = $suggestion.priority
                                        impact = $suggestion.impact
                                    }
                                }
                            }
                        }
                    }
                    
                    # Calculate Cascade score
                    $result.cascade.score = Get-CascadeScore -Patterns $result.patterns.detected
                }
                default {
                    $result.status.warnings += "Language $Language has limited pattern support"
                    Write-StructuredLog -Message "Language has limited pattern support" -Level WARNING -Properties @{
                        language = $Language
                    }
                }
            }
        }
        else {
            $result.status.warnings += "Failed to parse AST: $($astResult.errors -join ', ')"
            Write-StructuredLog -Message "Failed to parse AST" -Level WARNING -Properties @{
                errors = $astResult.errors
            }
        }
        
        # Update metrics
        $result.metrics.duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
        $result.metrics.patterns_analyzed = $result.patterns.statistics.total
        $result.metrics.nodes_visited = $astResult.metrics.nodes_visited
        
        Write-StructuredLog -Message "Pattern analysis completed" -Level INFO -Properties @{
            duration_ms = $result.metrics.duration_ms
            total_patterns = $result.patterns.statistics.total
            compatibility = $result.cascade.compatibility
            score = $result.cascade.score
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze patterns: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-PowerShellAstPatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Ast
    )
    
    $patterns = @{}
    $nodesVisited = 0
    
    try {
        # Visit each node in the AST
        $Ast.Visit([ScriptBlockAst]{
            param($node)
            
            $nodesVisited++
            
            # Check for command patterns
            if ($node -is [CommandAst]) {
                $commandName = $node.GetCommandName()
                if ($commandName) {
                    $patternKey = "command.$commandName"
                    if (-not $patterns[$patternKey]) {
                        $patterns[$patternKey] = @{
                            Type = "Command"
                            Count = 0
                            Location = @()
                        }
                    }
                    $patterns[$patternKey].Count++
                    $patterns[$patternKey].Location += $node.Extent
                }
            }
            
            # Check for variable patterns
            elseif ($node -is [VariableExpressionAst]) {
                $varName = $node.VariablePath.UserPath
                $patternKey = "variable.$varName"
                if (-not $patterns[$patternKey]) {
                    $patterns[$patternKey] = @{
                        Type = "Variable"
                        Count = 0
                        Location = @()
                    }
                }
                $patterns[$patternKey].Count++
                $patterns[$patternKey].Location += $node.Extent
            }
            
            # Check for function patterns
            elseif ($node -is [FunctionDefinitionAst]) {
                $funcName = $node.Name
                $patternKey = "function.$funcName"
                if (-not $patterns[$patternKey]) {
                    $patterns[$patternKey] = @{
                        Type = "Function"
                        Count = 0
                        Location = @()
                    }
                }
                $patterns[$patternKey].Count++
                $patterns[$patternKey].Location += $node.Extent
            }
            
            # Continue visiting child nodes
            return $true
        })
        
        return @{
            patterns = $patterns
            metrics = @{
                nodes_visited = $nodesVisited
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze PowerShell AST patterns: $_" -Level ERROR
        return @{
            patterns = @{}
            metrics = @{
                nodes_visited = $nodesVisited
            }
            error = $_.Exception.Message
        }
    }
}

function Get-LineContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [int]$LineNumber,
        [Parameter()]
        [int]$ContextLines = 2
    )
    
    try {
        $lines = $Content -split "`n"
        $start = [Math]::Max(0, $LineNumber - $ContextLines - 1)
        $end = [Math]::Min($lines.Count - 1, $LineNumber + $ContextLines - 1)
        
        $context = @()
        for ($i = $start; $i -le $end; $i++) {
            $context += @{
                line_number = $i + 1
                content = $lines[$i].TrimEnd()
                is_target = $i -eq ($LineNumber - 1)
            }
        }
        
        return $context
    }
    catch {
        Write-StructuredLog -Message "Failed to get line context: $_" -Level ERROR
        return @()
    }
}

function Get-CascadeScore {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Patterns
    )
    
    try {
        $score = 0.0
        $weights = @{
            compatibility = @{
                high = 1.0
                medium = 0.5
                low = 0.2
            }
            priority = @{
                high = 1.0
                medium = 0.5
                low = 0.2
            }
        }
        
        foreach ($pattern in $Patterns.Values) {
            $compatWeight = $weights.compatibility[$pattern.metadata.compatibility]
            $prioWeight = $weights.priority[$pattern.metadata.priority]
            $score += $pattern.count * $compatWeight * $prioWeight
        }
        
        return [Math]::Round($score, 2)
    }
    catch {
        Write-StructuredLog -Message "Failed to calculate Cascade score: $_" -Level ERROR
        return 0.0
    }
}

Export-ModuleMember -Function Get-FileLanguage, Get-CodePatterns
