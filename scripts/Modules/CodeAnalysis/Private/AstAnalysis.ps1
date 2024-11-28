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
            'typescript' {
                # Return a simplified AST for TypeScript
                return @{
                    success = $true
                    ast = @{
                        type = 'typescript'
                        content = $Content
                    }
                    errors = @()
                }
            }
            'javascript' {
                # Return a simplified AST for JavaScript
                return @{
                    success = $true
                    ast = @{
                        type = 'javascript'
                        content = $Content
                    }
                    errors = @()
                }
            }
            default {
                # Return a basic structure for unsupported languages
                return @{
                    success = $true
                    ast = @{
                        type = $Language
                        content = $Content
                    }
                    errors = @()
                }
            }
        }
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Error "Failed to parse ${Language} code: $errorMessage"
        return @{
            success = $false
            ast = $null
            errors = @($errorMessage)
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
            FunctionCount = 0
            CommandCount = 0
            VariableCount = 0
            MaxDepth = 0
            Complexity = 0
            LinesOfCode = 0
            Comments = 0
        }

        switch ($Language.ToLower()) {
            'powershell' {
                $visitor = {
                    param($node)
                    
                    switch ($node.GetType().Name) {
                        'FunctionDefinitionAst' { 
                            $metrics.FunctionCount++
                            $metrics.Complexity += Get-FunctionComplexity $node
                        }
                        'CommandAst' { $metrics.CommandCount++ }
                        'VariableExpressionAst' { $metrics.VariableCount++ }
                        'CommentAst' { $metrics.Comments++ }
                    }

                    # Calculate nesting depth
                    $depth = Get-AstDepth $node
                    if ($depth -gt $metrics.MaxDepth) {
                        $metrics.MaxDepth = $depth
                    }

                    return $true
                }

                $Ast.Visit($visitor)
                $metrics.LinesOfCode = ($Ast.Extent.Text -split "`n").Count
            }
            'typescript' {
                # Parse TypeScript AST using node
                $tsMetrics = Get-TypeScriptMetrics $Ast.content
                $metrics = @{
                    FunctionCount = $tsMetrics.functions
                    CommandCount = $tsMetrics.commands
                    VariableCount = $tsMetrics.variables
                    MaxDepth = $tsMetrics.maxDepth
                    Complexity = $tsMetrics.complexity
                    LinesOfCode = $tsMetrics.loc
                    Comments = $tsMetrics.comments
                }
            }
            'javascript' {
                # Similar to TypeScript but with JS-specific parsing
                $jsMetrics = Get-JavaScriptMetrics $Ast.content
                $metrics = @{
                    FunctionCount = $jsMetrics.functions
                    CommandCount = $jsMetrics.commands
                    VariableCount = $jsMetrics.variables
                    MaxDepth = $jsMetrics.maxDepth
                    Complexity = $jsMetrics.complexity
                    LinesOfCode = $jsMetrics.loc
                    Comments = $jsMetrics.comments
                }
            }
        }

        return $metrics
    }
    catch {
        Write-Error "Failed to calculate AST metrics: $_"
        return $null
    }
}

function Get-FunctionComplexity {
    param([System.Management.Automation.Language.FunctionDefinitionAst]$Function)
    
    $complexity = 1 # Base complexity
    
    $visitor = {
        param($node)
        
        switch ($node.GetType().Name) {
            # Control flow increases complexity
            'IfStatementAst' { $script:complexity++ }
            'SwitchStatementAst' { $script:complexity++ }
            'ForStatementAst' { $script:complexity++ }
            'WhileStatementAst' { $script:complexity++ }
            'TryStatementAst' { $script:complexity++ }
            'CatchClauseAst' { $script:complexity++ }
        }
        
        return $true
    }
    
    $script:complexity = $complexity
    $Function.Visit($visitor)
    return $script:complexity
}

function Get-AstDepth {
    param($Node)
    
    $depth = 0
    $current = $Node
    
    while ($current.Parent -ne $null) {
        $depth++
        $current = $current.Parent
    }
    
    return $depth
}

function Get-PowerShellPatterns {
    param($Ast)
    
    $patterns = @()
    
    $visitor = {
        param($node)
        
        switch ($node.GetType().Name) {
            'CommandAst' {
                # Check for common patterns in command usage
                $cmdName = $node.CommandElements[0].Value
                switch -Regex ($cmdName) {
                    '^Invoke-WebRequest|^Invoke-RestMethod' {
                        $patterns += @{
                            Type = 'WebRequest'
                            Line = $node.Extent.StartLineNumber
                            Command = $cmdName
                            Risk = 'Medium'
                            Suggestion = 'Consider error handling and timeout settings'
                        }
                    }
                    '^Remove-|^Delete' {
                        $patterns += @{
                            Type = 'Deletion'
                            Line = $node.Extent.StartLineNumber
                            Command = $cmdName
                            Risk = 'High'
                            Suggestion = 'Ensure proper backup and confirmation'
                        }
                    }
                }
            }
            'VariableExpressionAst' {
                # Check for sensitive variable names
                if ($node.VariablePath.UserPath -match '(?i)password|secret|key|token') {
                    $patterns += @{
                        Type = 'SensitiveData'
                        Line = $node.Extent.StartLineNumber
                        Variable = $node.VariablePath.UserPath
                        Risk = 'High'
                        Suggestion = 'Use SecureString or credential management'
                    }
                }
            }
        }
        
        return $true
    }
    
    $Ast.Visit($visitor)
    return $patterns
}

function Get-TypeScriptPatterns {
    param($Content)

    $patterns = @()
    
    # Match potentially dangerous patterns
    $dangerousPatterns = @{
        'eval\(' = @{
            Type = 'DangerousFunction'
            Risk = 'High'
            Suggestion = 'Avoid using eval as it can execute arbitrary code'
        }
        'innerHTML\s*=' = @{
            Type = 'XSSVulnerability'
            Risk = 'High'
            Suggestion = 'Use textContent or sanitize HTML content'
        }
        'localStorage\.' = @{
            Type = 'ClientStorage'
            Risk = 'Medium'
            Suggestion = 'Ensure sensitive data is not stored in localStorage'
        }
        'new\s+Function\(' = @{
            Type = 'DangerousFunction'
            Risk = 'High'
            Suggestion = 'Avoid dynamic function creation'
        }
        'document\.write\(' = @{
            Type = 'DOMManipulation'
            Risk = 'Medium'
            Suggestion = 'Use modern DOM manipulation methods'
        }
    }

    foreach ($pattern in $dangerousPatterns.GetEnumerator()) {
        $matches = [regex]::Matches($Content, $pattern.Key)
        foreach ($match in $matches) {
            $lineNumber = ($Content.Substring(0, $match.Index) -split "`n").Count
            $patterns += @{
                Type = $pattern.Value.Type
                Line = $lineNumber
                Pattern = $pattern.Key
                Risk = $pattern.Value.Risk
                Suggestion = $pattern.Value.Suggestion
            }
        }
    }

    # Check for proper error handling
    if ($Content -notmatch 'try\s*{.*}\s*catch') {
        $patterns += @{
            Type = 'ErrorHandling'
            Line = 1
            Pattern = 'Missing try-catch'
            Risk = 'Medium'
            Suggestion = 'Implement proper error handling with try-catch blocks'
        }
    }

    # Check for proper type definitions
    if ($Content -match ':\s*any\b') {
        $lineNumber = ($Content.Substring(0, $matches[0].Index) -split "`n").Count
        $patterns += @{
            Type = 'TypeSafety'
            Line = $lineNumber
            Pattern = 'any type'
            Risk = 'Low'
            Suggestion = 'Specify explicit types instead of using "any"'
        }
    }

    return $patterns
}

function Get-JavaScriptPatterns {
    param($Content)

    $patterns = @()
    
    # Match potentially dangerous patterns
    $dangerousPatterns = @{
        'eval\(' = @{
            Type = 'DangerousFunction'
            Risk = 'High'
            Suggestion = 'Avoid using eval as it can execute arbitrary code'
        }
        'innerHTML\s*=' = @{
            Type = 'XSSVulnerability'
            Risk = 'High'
            Suggestion = 'Use textContent or sanitize HTML content'
        }
        'setTimeout\(\s*["'']' = @{
            Type = 'DangerousFunction'
            Risk = 'Medium'
            Suggestion = 'Avoid passing strings to setTimeout/setInterval'
        }
        'with\s*\(' = @{
            Type = 'BadPractice'
            Risk = 'Medium'
            Suggestion = 'Avoid using the "with" statement'
        }
        '\==(?!=)' = @{
            Type = 'TypeCoercion'
            Risk = 'Low'
            Suggestion = 'Use === for strict equality comparison'
        }
    }

    foreach ($pattern in $dangerousPatterns.GetEnumerator()) {
        $matches = [regex]::Matches($Content, $pattern.Key)
        foreach ($match in $matches) {
            $lineNumber = ($Content.Substring(0, $match.Index) -split "`n").Count
            $patterns += @{
                Type = $pattern.Value.Type
                Line = $lineNumber
                Pattern = $pattern.Key
                Risk = $pattern.Value.Risk
                Suggestion = $pattern.Value.Suggestion
            }
        }
    }

    # Check for proper error handling
    if ($Content -notmatch 'try\s*{.*}\s*catch') {
        $patterns += @{
            Type = 'ErrorHandling'
            Line = 1
            Pattern = 'Missing try-catch'
            Risk = 'Medium'
            Suggestion = 'Implement proper error handling with try-catch blocks'
        }
    }

    # Check for proper async/await usage
    if ($Content -match 'async\s+function' -and $Content -notmatch 'await\s+') {
        $lineNumber = ($Content.Substring(0, $matches[0].Index) -split "`n").Count
        $patterns += @{
            Type = 'AsyncPattern'
            Line = $lineNumber
            Pattern = 'Missing await'
            Risk = 'Medium'
            Suggestion = 'Async function should use await operator'
        }
    }

    return $patterns
}

function Get-FileSymbols {
    param(
        [Parameter(Mandatory)]
        [object]$Ast,
        [Parameter(Mandatory)]
        [string]$Language
    )

    $symbols = @()

    switch ($Language.ToLower()) {
        'powershell' {
            $visitor = {
                param($node)
                
                switch ($node.GetType().Name) {
                    'FunctionDefinitionAst' {
                        $symbols += @{
                            name = $node.Name
                            type = 'Function'
                            location = @{
                                startLine = $node.Extent.StartLineNumber
                                endLine = $node.Extent.EndLineNumber
                            }
                            scope = if ($node.IsFilter) { 'Filter' } else { 'Function' }
                            visibility = if ($node.Name -cmatch '^[A-Z]') { 'Public' } else { 'Private' }
                        }
                    }
                    'TypeDefinitionAst' {
                        $symbols += @{
                            name = $node.Name
                            type = 'Class'
                            location = @{
                                startLine = $node.Extent.StartLineNumber
                                endLine = $node.Extent.EndLineNumber
                            }
                            scope = 'Global'
                            visibility = 'Public'
                        }
                    }
                    'VariableExpressionAst' {
                        # Only include script-level variables
                        if ($node.VariablePath.IsScript -or $node.VariablePath.IsGlobal) {
                            $symbols += @{
                                name = $node.VariablePath.UserPath
                                type = 'Variable'
                                location = @{
                                    startLine = $node.Extent.StartLineNumber
                                    endLine = $node.Extent.EndLineNumber
                                }
                                scope = if ($node.VariablePath.IsGlobal) { 'Global' } else { 'Script' }
                                visibility = 'Private'
                            }
                        }
                    }
                }
                
                return $true
            }
            
            $Ast.Visit($visitor)
        }
        'typescript' {
            # Extract TypeScript symbols using regex patterns
            $functionMatches = [regex]::Matches($Ast.content, '(?m)^(?:export\s+)?(?:async\s+)?function\s+(\w+)')
            foreach ($match in $functionMatches) {
                $lineNumber = ($Ast.content.Substring(0, $match.Index) -split "`n").Count
                $symbols += @{
                    name = $match.Groups[1].Value
                    type = 'Function'
                    location = @{
                        startLine = $lineNumber
                        endLine = $lineNumber
                    }
                    scope = 'Module'
                    visibility = if ($match.Value -match 'export') { 'Public' } else { 'Private' }
                }
            }

            $classMatches = [regex]::Matches($Ast.content, '(?m)^(?:export\s+)?class\s+(\w+)')
            foreach ($match in $classMatches) {
                $lineNumber = ($Ast.content.Substring(0, $match.Index) -split "`n").Count
                $symbols += @{
                    name = $match.Groups[1].Value
                    type = 'Class'
                    location = @{
                        startLine = $lineNumber
                        endLine = $lineNumber
                    }
                    scope = 'Module'
                    visibility = if ($match.Value -match 'export') { 'Public' } else { 'Private' }
                }
            }
        }
        'javascript' {
            # Extract JavaScript symbols using regex patterns
            $functionMatches = [regex]::Matches($Ast.content, '(?m)^(?:export\s+)?(?:async\s+)?function\s+(\w+)')
            foreach ($match in $functionMatches) {
                $lineNumber = ($Ast.content.Substring(0, $match.Index) -split "`n").Count
                $symbols += @{
                    name = $match.Groups[1].Value
                    type = 'Function'
                    location = @{
                        startLine = $lineNumber
                        endLine = $lineNumber
                    }
                    scope = 'Module'
                    visibility = if ($match.Value -match 'export') { 'Public' } else { 'Private' }
                }
            }

            $classMatches = [regex]::Matches($Ast.content, '(?m)^(?:export\s+)?class\s+(\w+)')
            foreach ($match in $classMatches) {
                $lineNumber = ($Ast.content.Substring(0, $match.Index) -split "`n").Count
                $symbols += @{
                    name = $match.Groups[1].Value
                    type = 'Class'
                    location = @{
                        startLine = $lineNumber
                        endLine = $lineNumber
                    }
                    scope = 'Module'
                    visibility = if ($match.Value -match 'export') { 'Public' } else { 'Private' }
                }
            }
        }
    }

    return $symbols
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
        $analysis = @{
            FilePath = $FilePath
            Language = $Language
            Patterns = @()
            Metrics = $null
            SecurityIssues = @()
            CodeSmells = @()
            ParseErrors = @()
            Symbols = @()
        }

        # Get AST
        $astResult = Get-AstParser -Language $Language -Content $Content
        if (-not $astResult.success) {
            $analysis.ParseErrors += $astResult.errors
            return $analysis
        }

        # Get metrics
        $analysis.Metrics = Get-AstMetrics -Ast $astResult.ast -Language $Language

        # Add language-specific analysis
        switch ($Language.ToLower()) {
            'powershell' {
                $analysis.Patterns += Get-PowerShellPatterns -Ast $astResult.ast
            }
            'typescript' {
                $analysis.Patterns += Get-TypeScriptPatterns -Content $Content
            }
            'javascript' {
                $analysis.Patterns += Get-JavaScriptPatterns -Content $Content
            }
        }

        # Get symbols
        $analysis.Symbols = Get-FileSymbols -Ast $astResult.ast -Language $Language

        return $analysis
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Error "Failed to analyze ${FilePath}: $errorMessage"
        return @{
            FilePath = $FilePath
            Language = $Language
            Error = $errorMessage
            Patterns = @()
            Metrics = $null
            SecurityIssues = @()
            CodeSmells = @()
            ParseErrors = @($errorMessage)
            Symbols = @()
        }
    }
}

Export-ModuleMember -Function Get-AstParser, Get-AstMetrics, Get-AstAnalysis
