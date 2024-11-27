using namespace System.Management.Automation.Language

# Import required modules
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

function Get-AstParser {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Language,
        [Parameter(Mandatory)]
        [string]$Content
    )

    try {
        switch ($Language.ToLower()) {
            'powershell' {
                $tokens = @()
                $parseErrors = @()
                $ast = [Parser]::ParseInput($Content, [ref]$tokens, [ref]$parseErrors)
                if ($parseErrors.Count -gt 0) {
                    Write-Warning "Parse errors found in PowerShell code: $($parseErrors | ForEach-Object { $_.Message })"
                }
                return @{
                    success = $true
                    ast = $ast
                    tokens = $tokens
                    errors = $parseErrors
                }
            }
            'python' {
                # Use Python's ast module via py-interop
                $pythonCode = @"
import ast
import json

try:
    tree = ast.parse(r'''$($Content -replace "'", "''")''')
    result = {
        'success': True,
        'ast': ast.dump(tree, indent=2),
        'errors': None
    }
except SyntaxError as e:
    result = {
        'success': False,
        'ast': None,
        'errors': str(e)
    }

print(json.dumps(result))
"@
                $result = & python -c $pythonCode 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-Warning "Python AST parsing failed: $result"
                    return @{
                        success = $false
                        ast = $null
                        errors = $result
                    }
                }
                return ($result | ConvertFrom-Json)
            }
            'javascript' {
                # Use esprima via node
                $jsCode = @"
const esprima = require('esprima');
try {
    const ast = esprima.parseScript(`$($Content -replace '`', '\`')`, { loc: true, range: true });
    console.log(JSON.stringify({ success: true, ast: ast, errors: null }));
} catch (e) {
    console.log(JSON.stringify({ success: false, ast: null, errors: e.message }));
}
"@
                $result = & node -e $jsCode 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-Warning "JavaScript AST parsing failed: $result"
                    return @{
                        success = $false
                        ast = $null
                        errors = $result
                    }
                }
                return ($result | ConvertFrom-Json)
            }
            default {
                Write-Warning "Language '$Language' not supported for AST parsing"
                return @{
                    success = $false
                    ast = $null
                    errors = "Language not supported"
                }
            }
        }
    }
    catch {
        Write-Error "Failed to parse AST for $Language : $_"
        return @{
            success = $false
            ast = $null
            errors = $_.Exception.Message
        }
    }
}

function Get-AstMetrics {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Ast,
        [Parameter(Mandatory)]
        [string]$Language
    )

    try {
        $metrics = @{
            complexity = 0
            depth = 0
            statements = 0
            functions = 0
            classes = 0
            dependencies = @()
            symbols = @()
        }

        switch ($Language.ToLower()) {
            'powershell' {
                # Calculate cyclomatic complexity
                $metrics.complexity = Get-PowerShellComplexity -Ast $Ast

                # Get dependencies
                $metrics.dependencies = Get-PowerShellDependencies -Ast $Ast

                # Get defined symbols
                $metrics.symbols = Get-PowerShellSymbols -Ast $Ast

                # Count statements, functions, and classes
                $visitor = {
                    param($astNode)
                    
                    switch ($astNode) {
                        { $_ -is [StatementAst] } { $metrics.statements++ }
                        { $_ -is [FunctionDefinitionAst] } { $metrics.functions++ }
                        { $_ -is [TypeDefinitionAst] } { $metrics.classes++ }
                        { $_ -is [CommandAst] -or 
                          $_ -is [PipelineAst] } { 
                            $metrics.depth = [Math]::Max(
                                $metrics.depth, 
                                ($astNode.Parent | Where-Object { $_ -is [PipelineAst] }).Count
                            )
                        }
                    }

                    return $true
                }

                [ScriptBlockAst]$Ast.Visit($visitor)
            }
            # Add support for other languages here
            default {
                Write-Warning "Metrics calculation not supported for language: $Language"
            }
        }

        return $metrics
    }
    catch {
        Write-Error "Failed to calculate AST metrics: $_"
        return @{
            complexity = 0
            depth = 0
            statements = 0
            functions = 0
            classes = 0
            dependencies = @()
            symbols = @()
        }
    }
}

function Get-PowerShellComplexity {
    [CmdletBinding()]
    param([Parameter(Mandatory)][object]$Ast)

    $complexity = 0
    $visitor = {
        param($astNode)
        
        switch ($astNode) {
            { $_ -is [IfStatementAst] -or 
              $_ -is [SwitchStatementAst] -or 
              $_ -is [ForStatementAst] -or 
              $_ -is [WhileStatementAst] -or 
              $_ -is [ForeachStatementAst] -or 
              $_ -is [TrapStatementAst] -or 
              $_ -is [CatchClauseAst] } {
                $complexity++
            }
            { $_ -is [BinaryExpressionAst] } {
                if ($_.Operator -in 'and', 'or') {
                    $complexity++
                }
            }
        }
        return $true
    }

    [ScriptBlockAst]$Ast.Visit($visitor)
    return $complexity
}

function Get-PowerShellDependencies {
    [CmdletBinding()]
    param([Parameter(Mandatory)][object]$Ast)

    $dependencies = [System.Collections.Generic.HashSet[string]]::new()
    $visitor = {
        param($astNode)
        
        if ($astNode -is [CommandAst]) {
            if ($astNode.CommandElements[0].Value -in @('Import-Module', 'using')) {
                $null = $dependencies.Add($astNode.CommandElements[1].Value)
            }
        }
        elseif ($astNode -is [UsingStatementAst]) {
            $null = $dependencies.Add($astNode.Name.Value)
        }
        return $true
    }

    [ScriptBlockAst]$Ast.Visit($visitor)
    return [string[]]$dependencies
}

function Get-PowerShellSymbols {
    [CmdletBinding()]
    param([Parameter(Mandatory)][object]$Ast)

    $symbols = [System.Collections.Generic.List[hashtable]]::new()
    $visitor = {
        param($astNode)
        
        switch ($astNode) {
            { $_ -is [FunctionDefinitionAst] } {
                $symbols.Add(@{
                    type = 'function'
                    name = $_.Name
                    start = $_.Extent.StartOffset
                    end = $_.Extent.EndOffset
                    scope = ($_.Parent | Where-Object { $_ -is [ScriptBlockAst] }).Count
                })
            }
            { $_ -is [TypeDefinitionAst] } {
                $symbols.Add(@{
                    type = 'class'
                    name = $_.Name
                    start = $_.Extent.StartOffset
                    end = $_.Extent.EndOffset
                    scope = ($_.Parent | Where-Object { $_ -is [ScriptBlockAst] }).Count
                })
            }
            { $_ -is [VariableExpressionAst] -and 
              $_.Parent -is [AssignmentStatementAst] } {
                $symbols.Add(@{
                    type = 'variable'
                    name = $_.VariablePath.UserPath
                    start = $_.Extent.StartOffset
                    end = $_.Extent.EndOffset
                    scope = ($_.Parent | Where-Object { $_ -is [ScriptBlockAst] }).Count
                })
            }
        }
        return $true
    }

    [ScriptBlockAst]$Ast.Visit($visitor)
    return $symbols.ToArray()
}

function Get-AstAnalysis {
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
        $astResult = Get-AstParser -Language $Language -Content $Content
        if (-not $astResult.success) {
            Write-Warning "Failed to parse AST for $FilePath"
            return $null
        }

        $analysis = @{
            FilePath = $FilePath
            Language = $Language
            Symbols = @()
            Dependencies = @()
            Scopes = @()
            CascadeMetadata = @{
                RefactoringTargets = @()
                SymbolGraph = @{}
                DependencyGraph = @{}
                ChangeImpact = @{}
            }
        }

        switch ($Language) {
            'powershell' {
                $analysis = Add-PowerShellAstAnalysis -Analysis $analysis -Ast $astResult.ast
            }
            'python' {
                $analysis = Add-PythonAstAnalysis -Analysis $analysis -AstDump $astResult.ast
            }
            'javascript' {
                $analysis = Add-JavaScriptAstAnalysis -Analysis $analysis -AstJson $astResult.ast
            }
        }

        # Build symbol graph for Cascade
        foreach ($symbol in $analysis.Symbols) {
            $analysis.CascadeMetadata.SymbolGraph[$symbol.name] = @{
                References = Get-SymbolReferences -Symbol $symbol -Content $Content
                Dependencies = Get-SymbolDependencies -Symbol $symbol -Analysis $analysis
                Complexity = Get-SymbolComplexity -Symbol $symbol -Content $Content
                RefactoringPriority = Get-RefactoringPriority -Symbol $symbol -Analysis $analysis
                SafetyScore = Get-RefactoringSafetyScore -Symbol $symbol -Analysis $analysis
            }
        }

        # Build dependency graph for change impact analysis
        foreach ($dep in $analysis.Dependencies) {
            $analysis.CascadeMetadata.DependencyGraph[$dep.source] = @{
                Target = $dep.target
                Type = $dep.type
                ImpactScore = Get-DependencyImpactScore -Dependency $dep -Analysis $analysis
                RefactoringRisk = Get-RefactoringRiskScore -Dependency $dep -Analysis $analysis
            }
        }

        # Identify high-value refactoring targets
        $analysis.CascadeMetadata.RefactoringTargets = Get-RefactoringTargets -Analysis $analysis |
            Sort-Object -Property Priority -Descending |
            Select-Object -First 10

        # Calculate change impact scores
        foreach ($target in $analysis.CascadeMetadata.RefactoringTargets) {
            $analysis.CascadeMetadata.ChangeImpact[$target.name] = @{
                DirectImpact = Get-DirectChangeImpact -Target $target -Analysis $analysis
                CascadingImpact = Get-CascadingChangeImpact -Target $target -Analysis $analysis
                TestCoverage = Get-TestCoverageScore -Target $target -Analysis $analysis
                AutomationConfidence = Get-AutomationConfidenceScore -Target $target -Analysis $analysis
            }
        }

        return $analysis
    }
    catch {
        Write-Error "Failed AST analysis for $FilePath : $_"
        return $null
    }
}

function Get-SymbolReferences {
    param($Symbol, $Content)
    # Implementation for finding all references to a symbol
    $references = @()
    $pattern = [regex]::Escape($Symbol.name)
    $matchResults = [regex]::Matches($Content, $pattern)
    
    foreach ($match in $matchResults) {
        $references += @{
            StartIndex = $match.Index
            EndIndex = $match.Index + $match.Length
            LineNumber = ($Content.Substring(0, $match.Index).Split("`n")).Count
            Context = Get-SymbolContext -Content $Content -Index $match.Index
        }
    }
    
    return $references
}

function Get-SymbolDependencies {
    param($Symbol, $Analysis)
    # Implementation for finding symbol dependencies
    $dependencies = @()
    
    foreach ($dep in $Analysis.Dependencies) {
        if ($dep.source -eq $Symbol.name) {
            $dependencies += @{
                Target = $dep.target
                Type = $dep.type
                IsRequired = $dep.required
                IsCascadeCompatible = Test-CascadeCompatibility -Dependency $dep
            }
        }
    }
    
    return $dependencies
}

function Get-SymbolComplexity {
    param($Symbol, $Content)
    # Implementation for calculating symbol complexity
    $metrics = @{
        CyclomaticComplexity = Get-CyclomaticComplexity -Symbol $Symbol -Content $Content
        CognitiveComplexity = Get-CognitiveComplexity -Symbol $Symbol -Content $Content
        LinesOfCode = ($Symbol.content -split "`n").Count
        NestedDepth = Get-MaxNestedDepth -Symbol $Symbol
        DependencyCount = ($Symbol.dependencies | Measure-Object).Count
    }
    
    return $metrics
}

function Get-RefactoringPriority {
    param($Symbol, $Analysis)
    # Implementation for calculating refactoring priority
    $priority = 0
    $complexity = Get-SymbolComplexity -Symbol $Symbol -Content $Analysis.Content
    
    # Weighted scoring based on multiple factors
    $priority += $complexity.CyclomaticComplexity * 0.3
    $priority += $complexity.CognitiveComplexity * 0.3
    $priority += ($complexity.LinesOfCode / 10) * 0.2
    $priority += $complexity.NestedDepth * 0.1
    $priority += $complexity.DependencyCount * 0.1
    
    return $priority
}

function Get-RefactoringSafetyScore {
    param($Symbol, $Analysis)
    # Implementation for calculating refactoring safety score
    $safety = 100  # Start with perfect score
    
    # Deduct points based on risk factors
    $deps = Get-SymbolDependencies -Symbol $Symbol -Analysis $Analysis
    $safety -= ($deps | Where-Object { -not $_.IsCascadeCompatible }).Count * 10
    
    $testCoverage = Get-TestCoverageScore -Target $Symbol -Analysis $Analysis
    $safety -= (100 - $testCoverage) * 0.3
    
    $complexity = Get-SymbolComplexity -Symbol $Symbol -Content $Analysis.Content
    $safety -= $complexity.CyclomaticComplexity * 2
    
    return [Math]::Max(0, [Math]::Min(100, $safety))
}

function Get-DirectChangeImpact {
    param($Target, $Analysis)
    # Implementation for calculating direct change impact
    $impact = @{
        AffectedFiles = @()
        AffectedSymbols = @()
        RiskLevel = 0
    }
    
    $refs = Get-SymbolReferences -Symbol $Target -Content $Analysis.Content
    foreach ($ref in $refs) {
        $file = Get-FileFromIndex -Path $ref.FilePath
        if ($file) {
            $impact.AffectedFiles += $file
            $impact.AffectedSymbols += Get-SymbolsAtLocation -File $file -Location $ref.Location
        }
    }
    
    $impact.RiskLevel = Calculate-RiskLevel -Impact $impact -Analysis $Analysis
    return $impact
}

function Get-CascadingChangeImpact {
    param($Target, $Analysis)
    # Implementation for calculating cascading change impact
    $impact = @{
        Depth = 0
        BranchingFactor = 0
        TotalAffectedComponents = 0
        CriticalPaths = @()
    }
    
    $graph = $Analysis.CascadeMetadata.DependencyGraph
    $visited = @{}
    $queue = @($Target.name)
    
    while ($queue.Count -gt 0) {
        $current = $queue[0]
        $queue = $queue[1..($queue.Count-1)]
        
        if (-not $visited[$current]) {
            $visited[$current] = $true
            $impact.TotalAffectedComponents++
            
            $deps = $graph[$current]
            if ($deps) {
                $impact.Depth = [Math]::Max($impact.Depth, $visited.Count)
                $impact.BranchingFactor = [Math]::Max($impact.BranchingFactor, $deps.Count)
                
                foreach ($dep in $deps) {
                    if (-not $visited[$dep.Target]) {
                        $queue += $dep.Target
                    }
                }
            }
        }
    }
    
    $impact.CriticalPaths = Find-CriticalPaths -Graph $graph -Start $Target.name -Visited $visited
    return $impact
}

# Export functions
Export-ModuleMember -Function Get-AstParser, Get-AstMetrics, Get-AstAnalysis
