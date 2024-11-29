# Documentation and metadata analyzer
function Get-DocumentationPatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Analysis,
        [Parameter(Mandatory)]
        [string]$Language,
        [string]$Context = 'any'
    )
    
    $patterns = @{
        documentation = @()
        testing = @()
        configuration = @()
    }

    switch ($Language) {
        { $_ -in 'typescript','javascript' } {
            # Documentation Patterns
            $patterns.documentation += @(
                @{
                    name = 'Missing JSDoc'
                    regex = '(export\s+(class|interface|type|function))'
                    antiregex = '(/\*\*[\s\S]*?\*/\s+export)'
                    suggestion = 'Add JSDoc documentation for exported items'
                    impact = 'medium'
                    category = 'maintainability'
                    example = @'
// Before
export class UserService {
    async getUser(id: string) {}
}

// After
/**
 * Service for managing user operations
 */
export class UserService {
    /**
     * Retrieves a user by their ID
     * @param id - The user's unique identifier
     * @returns Promise resolving to the user object
     * @throws {UserNotFoundError} When user doesn't exist
     */
    async getUser(id: string) {}
}
'@
                }
                @{
                    name = 'Type Documentation'
                    regex = '(@type|@param|@returns)'
                    suggestion = 'Add type documentation'
                    impact = 'medium'
                    category = 'maintainability'
                }
            )

            # Testing Patterns
            $patterns.testing += @(
                @{
                    name = 'Missing Unit Tests'
                    regex = '(export\s+(class|function))'
                    antiregex = '(\.spec\.ts|\.test\.ts)'
                    suggestion = 'Add unit tests for exported functionality'
                    impact = 'high'
                    category = 'quality'
                }
                @{
                    name = 'Test Coverage'
                    regex = '(describe|it|test|expect)'
                    suggestion = 'Ensure comprehensive test coverage'
                    impact = 'high'
                    category = 'quality'
                }
            )

            # Configuration Patterns
            $patterns.configuration += @(
                @{
                    name = 'Environment Variables'
                    regex = '(process\.env|ConfigService)'
                    suggestion = 'Use configuration service for env vars'
                    impact = 'medium'
                    category = 'maintainability'
                }
                @{
                    name = 'Feature Flags'
                    regex = '(isFeatureEnabled|toggleFeature)'
                    suggestion = 'Implement feature flag service'
                    impact = 'medium'
                    category = 'maintainability'
                }
            )
        }
        'go' {
            # Documentation Patterns
            $patterns.documentation += @(
                @{
                    name = 'Missing GoDoc'
                    regex = '^func\s+[A-Z]'
                    antiregex = '^\/\/\s+\w+'
                    suggestion = 'Add GoDoc comments for exported functions'
                    impact = 'medium'
                    category = 'maintainability'
                }
                @{
                    name = 'Example Tests'
                    regex = '(func\s+Example\w+)'
                    suggestion = 'Add example tests for documentation'
                    impact = 'medium'
                    category = 'maintainability'
                }
            )

            # Testing Patterns
            $patterns.testing += @(
                @{
                    name = 'Table Tests'
                    regex = '(func\s+Test\w+)'
                    suggestion = 'Use table-driven tests'
                    impact = 'medium'
                    category = 'quality'
                }
                @{
                    name = 'Benchmarks'
                    regex = '(func\s+Benchmark\w+)'
                    suggestion = 'Add benchmarks for critical paths'
                    impact = 'medium'
                    category = 'performance'
                }
            )

            # Configuration Patterns
            $patterns.configuration += @(
                @{
                    name = 'Configuration Management'
                    regex = '(viper\.|flag\.)'
                    suggestion = 'Use configuration management'
                    impact = 'medium'
                    category = 'maintainability'
                }
            )
        }
        'powershell' {
            # Documentation Patterns
            $patterns.documentation += @(
                @{
                    name = 'Missing Help'
                    regex = '(function\s+\w+)'
                    antiregex = '(<#[\s\S]*?#>)'
                    suggestion = 'Add comment-based help'
                    impact = 'medium'
                    category = 'maintainability'
                }
                @{
                    name = 'Parameter Documentation'
                    regex = '(\[Parameter\])'
                    suggestion = 'Document parameters'
                    impact = 'medium'
                    category = 'maintainability'
                }
            )

            # Testing Patterns
            $patterns.testing += @(
                @{
                    name = 'Pester Tests'
                    regex = '(Describe|Context|It)'
                    suggestion = 'Add Pester tests'
                    impact = 'high'
                    category = 'quality'
                }
            )

            # Configuration Patterns
            $patterns.configuration += @(
                @{
                    name = 'Configuration Files'
                    regex = '(Get-Content.*\.json|ConvertFrom-Json)'
                    suggestion = 'Use proper configuration files'
                    impact = 'medium'
                    category = 'maintainability'
                }
            )
        }
    }

    return $patterns
}

Export-ModuleMember -Function Get-DocumentationPatterns
