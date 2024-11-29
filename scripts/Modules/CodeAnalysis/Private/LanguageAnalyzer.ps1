# Language-agnostic code analyzer
function Get-TypeScriptAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$Path,
        [bool]$IsJavaScript = $false,
        [ValidateSet('frontend', 'backend', 'any')]
        [string]$Context = 'any'
    )
    
    try {
        Write-Verbose "Creating temporary directory for analysis"
        $tempDir = Join-Path $env:TEMP "ts-analysis"
        New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

        Write-Verbose "Creating analyzer script"
        $tempScriptPath = Join-Path $tempDir "analyzer.js"
        $analyzerContent = @'
try {
    const ts = require(require('path').join(process.cwd(), 'node_modules', 'typescript'));

    function analyzeTypeScript(sourceCode, isJavaScript, context) {
        try {
            const sourceFile = ts.createSourceFile(
                isJavaScript ? 'file.js' : 'file.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const analysis = {
                nodes: [],
                structure: {
                    depth: 0,
                    breadth: 0,
                    complexity: 0
                },
                issues: []
            };

            let currentDepth = 0;
            const lineNodes = new Map();
            let complexity = 0;

            // Track state for complex pattern detection
            const state = {
                currentClass: null,
                currentFunction: null,
                effectDependencies: new Map(),
                errorHandling: new Map(),
                validations: new Map()
            };

            function addIssue(type, message, node, impact = 'medium', category = 'best-practice', suggestion = '') {
                const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line;
                analysis.issues.push({
                    type,
                    message,
                    line,
                    impact,
                    category,
                    suggestion,
                    code: node.getText()
                });
            }

            function checkSecurityPattern(node) {
                // Check dangerous function calls
                if (ts.isCallExpression(node)) {
                    const fnName = node.expression.getText();
                    if (fnName === 'eval' || fnName === 'Function') {
                        addIssue(
                            'security',
                            `Avoid using ${fnName}() as it can execute arbitrary code`,
                            node,
                            'critical',
                            'security',
                            'Use safer alternatives like JSON.parse() for JSON or proper function definitions'
                        );
                    }
                }

                // Check innerHTML assignments
                if (ts.isPropertyAccessExpression(node) && 
                    node.name.getText() === 'innerHTML' &&
                    node.parent &&
                    ts.isBinaryExpression(node.parent) &&
                    node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                    addIssue(
                        'security',
                        'Unsafe innerHTML usage can lead to XSS vulnerabilities',
                        node,
                        'high',
                        'security',
                        'Use textContent or createElement for DOM manipulation'
                    );
                }

                // Check hardcoded secrets
                if (ts.isStringLiteral(node) && 
                    node.parent &&
                    ts.isVariableDeclaration(node.parent)) {
                    const varName = node.parent.name.getText().toLowerCase();
                    if (varName.includes('password') || 
                        varName.includes('secret') || 
                        varName.includes('key') || 
                        varName.includes('token')) {
                        addIssue(
                            'security',
                            'Hardcoded secret detected',
                            node,
                            'critical',
                            'security',
                            'Use environment variables or secure secret management'
                        );
                    }
                }
            }

            function checkReactPattern(node) {
                // Check useEffect dependencies
                if (ts.isCallExpression(node) && 
                    node.expression.getText() === 'useEffect' &&
                    node.arguments.length > 1) {
                    const depsArray = node.arguments[1];
                    if (ts.isArrayLiteralExpression(depsArray) && depsArray.elements.length === 0) {
                        addIssue(
                            'react-hooks',
                            'useEffect with empty dependency array might cause issues',
                            node,
                            'medium',
                            'react',
                            'Add required dependencies or use useLayoutEffect if intentional'
                        );
                    }
                }

                // Check proper memo usage
                if (ts.isCallExpression(node) && 
                    node.expression.getText() === 'useMemo' &&
                    (!node.arguments[1] || 
                     (ts.isArrayLiteralExpression(node.arguments[1]) && 
                      node.arguments[1].elements.length === 0))) {
                    addIssue(
                        'performance',
                        'useMemo without dependencies may be unnecessary',
                        node,
                        'medium',
                        'react',
                        'Add required dependencies or remove useMemo if not needed'
                    );
                }
            }

            function checkAPIPattern(node) {
                // Check error handling in async functions
                if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
                    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
                    if (isAsync) {
                        state.currentFunction = node;
                        state.errorHandling.set(node, false);
                    }
                }

                // Check for proper try-catch
                if (ts.isTryStatement(node)) {
                    if (state.currentFunction) {
                        state.errorHandling.set(state.currentFunction, true);
                    }
                    if (!node.catchClause) {
                        addIssue(
                            'error-handling',
                            'Try block without catch clause',
                            node,
                            'medium',
                            'reliability',
                            'Add error handling with catch clause'
                        );
                    }
                }

                // Check controller method decorators
                if (ts.isMethodDeclaration(node) && node.decorators) {
                    const hasValidation = node.decorators.some(d => 
                        d.expression.getText().includes('ValidateRequest') ||
                        d.expression.getText().includes('Validate')
                    );
                    if (!hasValidation) {
                        addIssue(
                            'validation',
                            'API endpoint without request validation',
                            node,
                            'high',
                            'reliability',
                            'Add request validation using class-validator or similar'
                        );
                    }
                }
            }

            function visit(node, depth = 0) {
                currentDepth = Math.max(currentDepth, depth);
                
                const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line;
                if (!lineNodes.has(line)) {
                    lineNodes.set(line, 0);
                }
                lineNodes.set(line, lineNodes.get(line) + 1);

                // Basic complexity tracking
                switch (node.kind) {
                    case ts.SyntaxKind.IfStatement:
                    case ts.SyntaxKind.WhileStatement:
                    case ts.SyntaxKind.ForStatement:
                    case ts.SyntaxKind.ForInStatement:
                    case ts.SyntaxKind.ForOfStatement:
                    case ts.SyntaxKind.DoStatement:
                    case ts.SyntaxKind.CaseClause:
                        complexity++;
                        break;
                }

                // Type safety checks
                if (ts.isTypeReferenceNode(node) && node.typeName.getText() === 'any') {
                    addIssue(
                        'type-safety',
                        'Avoid using "any" type',
                        node,
                        'medium',
                        'type-safety',
                        'Use proper type definitions or unknown if type is truly unknown'
                    );
                }

                // Pattern checks
                checkSecurityPattern(node);
                if (context === 'frontend') {
                    checkReactPattern(node);
                }
                if (context === 'backend') {
                    checkAPIPattern(node);
                }

                // Store node info
                analysis.nodes.push({
                    type: ts.SyntaxKind[node.kind],
                    start: node.getStart(),
                    end: node.getEnd(),
                    text: node.getText(),
                    line: line
                });

                // Visit children
                ts.forEachChild(node, child => visit(child, depth + 1));

                // Post-visit checks
                if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && 
                    node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
                    if (!state.errorHandling.get(node)) {
                        addIssue(
                            'error-handling',
                            'Async function without error handling',
                            node,
                            'high',
                            'reliability',
                            'Add try-catch blocks for error handling'
                        );
                    }
                }
            }

            visit(sourceFile);

            // Update structure metrics
            analysis.structure.depth = currentDepth;
            analysis.structure.breadth = Math.max(...Array.from(lineNodes.values()));
            analysis.structure.complexity = complexity;

            return { success: true, analysis };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    const sourceCode = Buffer.from(process.argv[2], 'base64').toString('utf8');
    const isJavaScript = process.argv[3] === 'true';
    const context = process.argv[4] || 'any';

    const result = analyzeTypeScript(sourceCode, isJavaScript, context);
    process.stdout.write(JSON.stringify(result));
} catch (error) {
    process.stdout.write(JSON.stringify({ success: false, error: error.message }));
}
'@
        Set-Content -Path $tempScriptPath -Value $analyzerContent -Force

        Write-Verbose "Running analyzer"
        $encodedContent = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Content))
        $result = node $tempScriptPath $encodedContent $IsJavaScript $Context
        Write-Verbose "Node.js output: $result"
        
        Write-Verbose "Parsing result"
        $parsedResult = $result | ConvertFrom-Json
        
        Write-Verbose "Cleaning up"
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        
        if (-not $parsedResult.success) {
            throw "TypeScript analysis failed: $($parsedResult.error)"
        }
        
        Write-Verbose "Analysis successful"
        return $parsedResult.analysis
    }
    catch {
        Write-Error "Failed to analyze TypeScript/JavaScript: $_"
        return $null
    }
}

# Rest of the file unchanged...
