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

# Export functions
Export-ModuleMember -Function Get-AstParser, Get-AstMetrics
