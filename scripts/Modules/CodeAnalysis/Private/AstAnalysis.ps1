using namespace System.Management.Automation.Language

# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

function New-AstResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [string]$Language,
        [Parameter()]
        [string]$Operation = "parse"
    )
    
    return @{
        metadata = @{
            path = $FilePath
            language = $Language
            operation = $Operation
            timestamp = Get-Date -Format "o"
            version = "1.0"
        }
        ast = @{
            type = "unknown"
            nodes = 0
            depth = 0
            size = 0
            language = $Language
        }
        metrics = @{
            duration_ms = 0
            memory_mb = 0
            nodes_visited = 0
            max_depth = 0
        }
        analysis = @{
            complexity = 0
            dependencies = @()
            imports = @()
            functions = @()
            variables = @()
        }
        status = @{
            success = $true
            parsed = $false
            warnings = @()
            errors = @()
        }
    }
}

function Get-AstParser {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Language,
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$FilePath
    )
    
    try {
        Write-StructuredLog -Message "Parsing AST" -Level INFO
        $startTime = Get-Date
        
        $result = New-AstResult -FilePath $FilePath -Language $Language
        
        switch ($Language.ToLower()) {
            'powershell' {
                $tokens = $null
                $parseErrors = $null
                $ast = [Parser]::ParseInput($Content, [ref]$tokens, [ref]$parseErrors)
                
                if ($parseErrors) {
                    $result.status.warnings += $parseErrors | ForEach-Object {
                        "Line $($_.Extent.StartLineNumber): $($_.Message)"
                    }
                }
                
                if ($ast) {
                    $result.status.parsed = $true
                    $result.ast = @{
                        type = "PowerShell"
                        ast = $ast
                        tokens = $tokens
                        nodes = ($ast.FindAll({$true}, $true)).Count
                        depth = Get-AstDepth -Ast $ast
                        size = [System.Text.Encoding]::UTF8.GetByteCount($Content)
                        language = $Language
                    }
                    
                    # Analyze AST structure
                    $analysis = Get-AstAnalysis -Ast $ast
                    $result.analysis = $analysis
                    $result.metrics.nodes_visited = $analysis.metrics.nodes_visited
                    $result.metrics.max_depth = $analysis.metrics.max_depth
                    
                    Write-StructuredLog -Message "Successfully parsed PowerShell AST" -Level INFO -Properties @{
                        nodes = $result.ast.nodes
                        depth = $result.ast.depth
                        size = $result.ast.size
                    }
                }
            }
            default {
                $result.status.warnings += "Language $Language not supported for AST parsing"
                Write-StructuredLog -Message "Unsupported language for AST parsing" -Level WARNING -Properties @{
                    language = $Language
                }
            }
        }
        
        $result.metrics.duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to parse AST: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-AstDepth {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.Language.Ast]$Ast,
        [Parameter()]
        [int]$CurrentDepth = 0
    )
    
    try {
        $maxDepth = $CurrentDepth
        
        foreach ($child in $Ast.FindAll({$true}, $false)) {
            $childDepth = Get-AstDepth -Ast $child -CurrentDepth ($CurrentDepth + 1)
            if ($childDepth -gt $maxDepth) {
                $maxDepth = $childDepth
            }
        }
        
        return $maxDepth
    }
    catch {
        Write-StructuredLog -Message "Failed to calculate AST depth: $_" -Level ERROR
        return $CurrentDepth
    }
}

function Get-AstAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.Language.Ast]$Ast
    )
    
    try {
        $analysis = @{
            complexity = 0
            dependencies = @()
            imports = @()
            functions = @()
            variables = @()
            metrics = @{
                nodes_visited = 0
                max_depth = 0
            }
        }
        
        # Track visited nodes
        $visitedNodes = @{}
        
        # Visit each node in the AST
        $Ast.Visit([ScriptBlockAst]{
            param($node)
            
            $analysis.metrics.nodes_visited++
            
            # Calculate cyclomatic complexity
            if ($node -is [IfStatementAst] -or 
                $node -is [SwitchStatementAst] -or 
                $node -is [ForStatementAst] -or 
                $node -is [WhileStatementAst] -or 
                $node -is [DoWhileStatementAst] -or 
                $node -is [ForEachStatementAst] -or 
                $node -is [TrapStatementAst]) {
                $analysis.complexity++
            }
            
            # Track imports and dependencies
            if ($node -is [CommandAst]) {
                $commandName = $node.GetCommandName()
                if ($commandName -eq 'Import-Module' -or $commandName -eq 'using') {
                    $analysis.imports += @{
                        type = $commandName
                        name = $node.CommandElements[1].Value
                        line = $node.Extent.StartLineNumber
                    }
                }
            }
            
            # Track functions
            if ($node -is [FunctionDefinitionAst]) {
                $analysis.functions += @{
                    name = $node.Name
                    parameters = $node.Parameters.Count
                    body_length = $node.Body.Extent.Text.Length
                    start_line = $node.Extent.StartLineNumber
                    end_line = $node.Extent.EndLineNumber
                }
            }
            
            # Track variables
            if ($node -is [VariableExpressionAst]) {
                if (-not $visitedNodes.ContainsKey($node.VariablePath.UserPath)) {
                    $visitedNodes[$node.VariablePath.UserPath] = $true
                    $analysis.variables += @{
                        name = $node.VariablePath.UserPath
                        first_use = $node.Extent.StartLineNumber
                    }
                }
            }
            
            return $true
        })
        
        return $analysis
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze AST: $_" -Level ERROR
        return @{
            complexity = 0
            dependencies = @()
            imports = @()
            functions = @()
            variables = @()
            metrics = @{
                nodes_visited = 0
                max_depth = 0
            }
        }
    }
}

function Get-AstMetrics {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Ast,
        [Parameter()]
        [object]$Result
    )
    
    try {
        Write-StructuredLog -Message "Calculating AST metrics" -Level INFO
        
        if (-not $Result) {
            $Result = New-AstResult -FilePath $Ast.Extent.File -Language "PowerShell"
        }
        
        # Calculate cyclomatic complexity
        $functionVisitor = {
            param($node)
            
            $complexity = 1
            
            if ($node -is [System.Management.Automation.Language.IfStatementAst] -or
                $node -is [System.Management.Automation.Language.SwitchStatementAst] -or
                $node -is [System.Management.Automation.Language.ForStatementAst] -or
                $node -is [System.Management.Automation.Language.WhileStatementAst] -or
                $node -is [System.Management.Automation.Language.TryStatementAst]) {
                $complexity++
            }
            
            $Result.ast.metrics.complexity += $complexity
            return $true
        }
        
        $null = $Ast.Visit($functionVisitor)
        
        # Count functions and classes
        $symbolVisitor = {
            param($node)
            
            if ($node -is [System.Management.Automation.Language.FunctionDefinitionAst]) {
                $Result.ast.metrics.functions++
            }
            elseif ($node -is [System.Management.Automation.Language.TypeDefinitionAst]) {
                $Result.ast.metrics.classes++
            }
            
            return $true
        }
        
        $null = $Ast.Visit($symbolVisitor)
        
        # Count lines
        $Result.ast.metrics.lines = ($Ast.Extent.Text -split "`n").Count
        
        return $Result
    }
    catch {
        Write-StructuredLog -Message "Failed to calculate AST metrics: $_" -Level ERROR
        $Result.status.success = $false
        $Result.status.errors += $_.Exception.Message
        return $Result
    }
}

function Get-PowerShellPatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.Language.Ast]$Ast,
        [Parameter()]
        [object]$Result
    )
    
    try {
        Write-StructuredLog -Message "Analyzing PowerShell patterns" -Level INFO
        
        if (-not $Result) {
            $Result = New-AstResult -FilePath $Ast.Extent.File -Language "PowerShell"
        }
        
        # Pattern detection for various PowerShell constructs
        $patternVisitor = {
            param($node)
            
            if ($node -is [System.Management.Automation.Language.CommandAst]) {
                $command = $node.GetCommandName()
                if ($command) {
                    $Result.analysis.patterns.matches += @{
                        type = "command"
                        name = $command
                        line = $node.Extent.StartLineNumber
                        confidence = 1.0
                    }
                }
            }
            elseif ($node -is [System.Management.Automation.Language.UsingStatementAst]) {
                $Result.analysis.patterns.matches += @{
                    type = "using"
                    name = $node.Name.Value
                    line = $node.Extent.StartLineNumber
                    confidence = 1.0
                }
            }
            
            return $true
        }
        
        $null = $Ast.Visit($patternVisitor)
        
        # Calculate pattern statistics
        $Result.ast.metrics.patterns = $Result.analysis.patterns.matches.Count
        $Result.analysis.patterns.categories = $Result.analysis.patterns.matches | 
            Group-Object -Property type | 
            Select-Object -Property @{N='category';E={$_.Name}}, @{N='count';E={$_.Count}}
        
        # Calculate confidence score
        if ($Result.analysis.patterns.matches.Count -gt 0) {
            $Result.analysis.patterns.confidence = ($Result.analysis.patterns.matches | 
                Measure-Object -Property confidence -Average).Average
        }
        
        return $Result
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze PowerShell patterns: $_" -Level ERROR
        $Result.status.success = $false
        $Result.status.errors += $_.Exception.Message
        return $Result
    }
}

function Get-FileSymbols {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Ast,
        [Parameter()]
        [object]$Result
    )
    
    try {
        Write-StructuredLog -Message "Extracting file symbols" -Level INFO
        
        if (-not $Result) {
            $Result = New-AstResult -FilePath $Ast.Extent.File -Language "PowerShell"
        }
        
        $symbolVisitor = {
            param($node)
            
            if ($node -is [System.Management.Automation.Language.FunctionDefinitionAst]) {
                $Result.ast.symbols += @{
                    type = "function"
                    name = $node.Name
                    line = $node.Extent.StartLineNumber
                    scope = if ($node.IsFilter) { "filter" } else { "function" }
                }
            }
            elseif ($node -is [System.Management.Automation.Language.TypeDefinitionAst]) {
                $Result.ast.symbols += @{
                    type = "class"
                    name = $node.Name
                    line = $node.Extent.StartLineNumber
                    scope = "class"
                }
            }
            elseif ($node -is [System.Management.Automation.Language.VariableExpressionAst]) {
                $Result.ast.symbols += @{
                    type = "variable"
                    name = $node.VariablePath.UserPath
                    line = $node.Extent.StartLineNumber
                    scope = "variable"
                }
            }
            
            return $true
        }
        
        $null = $Ast.Visit($symbolVisitor)
        
        return $Result
    }
    catch {
        Write-StructuredLog -Message "Failed to extract file symbols: $_" -Level ERROR
        $Result.status.success = $false
        $Result.status.errors += $_.Exception.Message
        return $Result
    }
}

function Get-AstAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter()]
        [string]$Language = "PowerShell",
        [Parameter()]
        [string]$Content
    )
    
    try {
        Write-StructuredLog -Message "Starting AST analysis for $FilePath" -Level INFO
        
        if (-not $Content) {
            $Content = Get-Content -Path $FilePath -Raw
        }
        
        # Initialize result
        $result = New-AstResult -FilePath $FilePath -Language $Language
        
        # Parse AST
        $parseResult = Get-AstParser -Language $Language -Content $Content -FilePath $FilePath
        if (-not $parseResult.success) {
            return $parseResult.result
        }
        
        $ast = $parseResult.ast
        $result = $parseResult.result
        
        # Get metrics
        $result = Get-AstMetrics -Ast $ast -Result $result
        
        # Get patterns
        $result = Get-PowerShellPatterns -Ast $ast -Result $result
        
        # Get symbols
        $result = Get-FileSymbols -Ast $ast -Result $result
        
        Write-StructuredLog -Message "Completed AST analysis" -Level INFO -Properties @{
            metrics = $result.ast.metrics
            patterns = $result.ast.metrics.patterns
            symbols = $result.ast.symbols.Count
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to complete AST analysis: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

Export-ModuleMember -Function Get-AstAnalysis
