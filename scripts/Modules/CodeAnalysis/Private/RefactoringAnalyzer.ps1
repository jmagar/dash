# Refactoring suggestion analyzer
function Get-RefactoringSuggestions {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Analysis,
        [Parameter(Mandatory)]
        [string]$Language,
        [string]$Context = 'any'
    )
    
    $suggestions = @{
        architectural = @()
        patterns = @()
        performance = @()
        maintainability = @()
    }
    
    # Common refactoring patterns
    $patterns = @{
        longMethod = @{
            threshold = 30  # lines
            suggestion = "Consider breaking down long methods into smaller, focused functions"
        }
        highComplexity = @{
            threshold = 10  # cyclomatic complexity
            suggestion = "Reduce complexity by extracting logic into helper functions"
        }
        duplicateCode = @{
            threshold = 0.8  # similarity score
            suggestion = "Extract duplicate code into shared utility functions"
        }
        tooManyParams = @{
            threshold = 4
            suggestion = "Consider using parameter objects or builder pattern"
        }
    }
    
    # Language-specific patterns
    switch ($Language) {
        { $_ -in 'typescript','javascript' } {
            if ($Context -eq 'frontend' -or $Context -eq 'any') {
                # React-specific patterns
                $reactPatterns = @{
                    largeComponent = @{
                        threshold = 200  # lines
                        suggestion = "Break down large components into smaller, focused components"
                    }
                    propDrilling = @{
                        threshold = 3  # levels
                        suggestion = "Consider using Context or state management for deeply passed props"
                    }
                    useEffectDeps = @{
                        suggestion = "Optimize useEffect dependencies or consider custom hooks"
                    }
                    inlineStyles = @{
                        suggestion = "Move inline styles to styled-components or CSS modules"
                    }
                }
                
                # Analyze React patterns
                foreach ($node in $Analysis.nodes) {
                    if ($node.type -eq 'FunctionDeclaration' -or $node.type -eq 'ArrowFunction') {
                        $componentSize = ($node.text -split "`n").Count
                        if ($componentSize -gt $reactPatterns.largeComponent.threshold) {
                            $suggestions.architectural += @{
                                type = 'component'
                                severity = 'warning'
                                message = $reactPatterns.largeComponent.suggestion
                                location = @{
                                    line = $node.line
                                    code = $node.text.Substring(0, [Math]::Min(100, $node.text.Length))
                                }
                                refactoring = @{
                                    type = 'extract_component'
                                    description = "Extract logical sections into separate components"
                                    example = @"
// Before
function LargeComponent() {
    // ... 200+ lines of code ...
}

// After
function LargeComponent() {
    return (
        <>
            <SubComponentA />
            <SubComponentB />
            <SubComponentC />
        </>
    )
}
"@
                                }
                            }
                        }
                    }
                }
            }
            
            if ($Context -eq 'backend' -or $Context -eq 'any') {
                # NestJS/Express patterns
                $backendPatterns = @{
                    controllerSize = @{
                        threshold = 300  # lines
                        suggestion = "Split large controllers into feature modules"
                    }
                    middlewareChain = @{
                        threshold = 5  # middleware count
                        suggestion = "Consider combining or reorganizing middleware"
                    }
                    routeComplexity = @{
                        threshold = 15  # complexity
                        suggestion = "Extract complex route logic into services"
                    }
                }
                
                # Analyze backend patterns
                foreach ($node in $Analysis.nodes) {
                    if ($node.type -eq 'ClassDeclaration') {
                        $isController = $Analysis.patterns.backend | Where-Object { $_.type -eq 'controller' -and $_.line -eq $node.line }
                        if ($isController) {
                            $controllerSize = ($node.text -split "`n").Count
                            if ($controllerSize -gt $backendPatterns.controllerSize.threshold) {
                                $suggestions.architectural += @{
                                    type = 'controller'
                                    severity = 'warning'
                                    message = $backendPatterns.controllerSize.suggestion
                                    location = @{
                                        line = $node.line
                                        code = $node.text.Substring(0, [Math]::Min(100, $node.text.Length))
                                    }
                                    refactoring = @{
                                        type = 'split_controller'
                                        description = "Split controller into feature modules"
                                        example = @"
// Before
@Controller('users')
export class UserController {
    // ... 300+ lines of code ...
}

// After
@Controller('users/profile')
export class UserProfileController {
    // Profile-related endpoints
}

@Controller('users/settings')
export class UserSettingsController {
    // Settings-related endpoints
}
"@
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        'go' {
            # Go-specific patterns
            $goPatterns = @{
                errorHandling = @{
                    suggestion = "Use custom error types for better error handling"
                }
                interfaceSize = @{
                    threshold = 5  # methods
                    suggestion = "Break down large interfaces into smaller, focused ones"
                }
                structSize = @{
                    threshold = 10  # fields
                    suggestion = "Consider splitting large structs"
                }
            }
            
            # Analyze Go patterns
            foreach ($node in $Analysis.nodes) {
                if ($node.type -eq '*ast.InterfaceType') {
                    $methodCount = ($node.text | Select-String -Pattern 'func' -AllMatches).Matches.Count
                    if ($methodCount -gt $goPatterns.interfaceSize.threshold) {
                        $suggestions.architectural += @{
                            type = 'interface'
                            severity = 'warning'
                            message = $goPatterns.interfaceSize.suggestion
                            location = @{
                                line = $node.line
                                code = $node.text.Substring(0, [Math]::Min(100, $node.text.Length))
                            }
                            refactoring = @{
                                type = 'split_interface'
                                description = "Split interface based on responsibilities"
                                example = @"
// Before
type LargeHandler interface {
    HandleHTTP(w http.ResponseWriter, r *http.Request)
    ProcessData(data []byte) error
    ValidateInput(input string) bool
    TransformOutput(data interface{}) interface{}
    PersistResults(results []Result) error
    // ... more methods ...
}

// After
type HTTPHandler interface {
    HandleHTTP(w http.ResponseWriter, r *http.Request)
}

type DataProcessor interface {
    ProcessData(data []byte) error
    TransformOutput(data interface{}) interface{}
}

type DataPersister interface {
    PersistResults(results []Result) error
}
"@
                            }
                        }
                    }
                }
            }
        }
        'powershell' {
            # PowerShell-specific patterns
            $psPatterns = @{
                scriptSize = @{
                    threshold = 500  # lines
                    suggestion = "Split large scripts into modules"
                }
                functionComplexity = @{
                    threshold = 8  # complexity
                    suggestion = "Simplify complex functions"
                }
                parameterCount = @{
                    threshold = 6  # parameters
                    suggestion = "Use parameter sets or splatting"
                }
            }
            
            # Analyze PowerShell patterns
            foreach ($node in $Analysis.nodes) {
                if ($node.type -eq 'FunctionDefinitionAst') {
                    $complexity = ($node.text | Select-String -Pattern 'if|while|foreach|switch' -AllMatches).Matches.Count
                    if ($complexity -gt $psPatterns.functionComplexity.threshold) {
                        $suggestions.maintainability += @{
                            type = 'function'
                            severity = 'warning'
                            message = $psPatterns.functionComplexity.suggestion
                            location = @{
                                line = $node.line
                                code = $node.text.Substring(0, [Math]::Min(100, $node.text.Length))
                            }
                            refactoring = @{
                                type = 'simplify_function'
                                description = "Break down complex function into smaller functions"
                                example = @"
# Before
function Process-Data {
    param($data)
    if (...) {
        while (...) {
            foreach (...) {
                if (...) {
                    switch (...) {
                        # Complex nested logic
                    }
                }
            }
        }
    }
}

# After
function Process-Data {
    param($data)
    $validatedData = Validate-InputData $data
    $processedData = Process-DataChunks $validatedData
    Format-ProcessedData $processedData
}

function Validate-InputData { ... }
function Process-DataChunks { ... }
function Format-ProcessedData { ... }
"@
                            }
                        }
                    }
                }
            }
        }
    }
    
    # Common patterns across all languages
    foreach ($node in $Analysis.nodes) {
        # Check method length
        $methodLength = ($node.text -split "`n").Count
        if ($methodLength -gt $patterns.longMethod.threshold) {
            $suggestions.maintainability += @{
                type = 'method'
                severity = 'warning'
                message = $patterns.longMethod.suggestion
                location = @{
                    line = $node.line
                    code = $node.text.Substring(0, [Math]::Min(100, $node.text.Length))
                }
            }
        }
        
        # Check complexity
        if ($Analysis.structure.complexity -gt $patterns.highComplexity.threshold) {
            $suggestions.maintainability += @{
                type = 'complexity'
                severity = 'warning'
                message = $patterns.highComplexity.suggestion
                location = @{
                    line = $node.line
                    code = $node.text.Substring(0, [Math]::Min(100, $node.text.Length))
                }
            }
        }
    }
    
    return $suggestions
}

Export-ModuleMember -Function Get-RefactoringSuggestions
