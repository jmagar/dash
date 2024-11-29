# Advanced pattern analyzer
function Get-AdvancedPatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Analysis,
        [Parameter(Mandatory)]
        [string]$Language,
        [string]$Context = 'any'
    )
    
    $patterns = @{
        state = @()
        error = @()
        testing = @()
        api = @()
        data = @()
        security = @()
        performance = @()
        monitoring = @()
        validation = @()
        composition = @()
    }

    switch ($Language) {
        { $_ -in 'typescript','javascript' } {
            if ($Context -eq 'backend') {
                # NestJS/Express Patterns
                $patterns.validation += @(
                    @{
                        name = 'DTO Validation'
                        regex = '(@IsString|@IsNumber|@IsBoolean|@ValidateNested)'
                        suggestion = 'Implement comprehensive DTO validation'
                        impact = 'high'
                        category = 'reliability'
                    }
                    @{
                        name = 'Custom Validators'
                        regex = '(@ValidatorConstraint|implements CustomValidator)'
                        suggestion = 'Use custom validators for complex validation'
                        impact = 'medium'
                        category = 'reliability'
                    }
                )

                $patterns.api += @(
                    @{
                        name = 'Exception Filters'
                        regex = '(@Catch|implements ExceptionFilter)'
                        suggestion = 'Implement custom exception filters for error handling'
                        impact = 'high'
                        category = 'reliability'
                    }
                    @{
                        name = 'Custom Decorators'
                        regex = '(createParamDecorator|applyDecorators)'
                        suggestion = 'Use custom decorators for cross-cutting concerns'
                        impact = 'medium'
                        category = 'architecture'
                    }
                )

                $patterns.monitoring += @(
                    @{
                        name = 'Request Logging'
                        regex = '(Logger\.log|console\.log)'
                        suggestion = 'Use structured logging with proper levels'
                        impact = 'medium'
                        category = 'observability'
                    }
                    @{
                        name = 'Metrics Collection'
                        regex = '(Histogram|Counter|Gauge)'
                        suggestion = 'Implement comprehensive metrics collection'
                        impact = 'high'
                        category = 'observability'
                    }
                )
            }
            
            if ($Context -eq 'frontend') {
                # React Patterns
                $patterns.composition += @(
                    @{
                        name = 'Component Composition'
                        regex = '(children:|React\.Children)'
                        suggestion = 'Use composition over inheritance'
                        impact = 'high'
                        category = 'architecture'
                    }
                    @{
                        name = 'Custom Hooks'
                        regex = '(function use[A-Z])'
                        suggestion = 'Extract reusable logic into custom hooks'
                        impact = 'medium'
                        category = 'architecture'
                    }
                )

                $patterns.data += @(
                    @{
                        name = 'Data Fetching'
                        regex = '(useQuery|useMutation|fetch\()'
                        suggestion = 'Implement proper data fetching patterns with caching'
                        impact = 'high'
                        category = 'performance'
                    }
                    @{
                        name = 'Form Handling'
                        regex = '(handleSubmit|onChange|onBlur)'
                        suggestion = 'Use form libraries for complex forms'
                        impact = 'medium'
                        category = 'usability'
                    }
                )

                $patterns.performance += @(
                    @{
                        name = 'Render Optimization'
                        regex = '(useMemo|useCallback|React\.memo)'
                        suggestion = 'Optimize renders for complex components'
                        impact = 'high'
                        category = 'performance'
                    }
                    @{
                        name = 'Code Splitting'
                        regex = '(React\.lazy|Suspense)'
                        suggestion = 'Implement code splitting for large applications'
                        impact = 'high'
                        category = 'performance'
                    }
                )
            }
        }
        'go' {
            # Agent-specific Patterns
            $patterns.monitoring += @(
                @{
                    name = 'System Metrics'
                    regex = '(cpu\.|memory\.|disk\.)'
                    suggestion = 'Implement comprehensive system metrics collection'
                    impact = 'high'
                    category = 'observability'
                }
                @{
                    name = 'Health Checks'
                    regex = '(/health|/ready|/live)'
                    suggestion = 'Implement proper health check endpoints'
                    impact = 'high'
                    category = 'reliability'
                }
            )

            $patterns.performance += @(
                @{
                    name = 'Process Management'
                    regex = '(exec\.Command|os\.Process)'
                    suggestion = 'Implement proper process lifecycle management'
                    impact = 'high'
                    category = 'reliability'
                }
                @{
                    name = 'Resource Limits'
                    regex = '(SetLimit|ulimit)'
                    suggestion = 'Set appropriate resource limits'
                    impact = 'high'
                    category = 'reliability'
                }
            )

            $patterns.security += @(
                @{
                    name = 'Privilege Management'
                    regex = '(os\.Chmod|os\.Chown)'
                    suggestion = 'Implement proper privilege management'
                    impact = 'critical'
                    category = 'security'
                }
                @{
                    name = 'Signal Handling'
                    regex = '(signal\.Notify|os\.Signal)'
                    suggestion = 'Implement proper signal handling'
                    impact = 'high'
                    category = 'reliability'
                }
            )
        }
        'powershell' {
            # Infrastructure Patterns
            $patterns.monitoring += @(
                @{
                    name = 'Script Logging'
                    regex = '(Write-Log|Start-Transcript)'
                    suggestion = 'Implement proper script logging'
                    impact = 'medium'
                    category = 'observability'
                }
                @{
                    name = 'Error Reporting'
                    regex = '(Write-Error|throw)'
                    suggestion = 'Implement structured error reporting'
                    impact = 'high'
                    category = 'reliability'
                }
            )

            $patterns.security += @(
                @{
                    name = 'Credential Handling'
                    regex = '(Get-Credential|ConvertTo-SecureString)'
                    suggestion = 'Use secure credential handling'
                    impact = 'critical'
                    category = 'security'
                }
                @{
                    name = 'Permission Checks'
                    regex = '(Test-Path|Get-Acl)'
                    suggestion = 'Implement proper permission checks'
                    impact = 'high'
                    category = 'security'
                }
            )
        }
    }

    # Common Patterns
    $patterns.security += @{
        name = 'Secret Management'
        regex = '(password|secret|key|token|credential)'
        suggestion = 'Use proper secret management'
        impact = 'critical'
        category = 'security'
    }

    $patterns.performance += @{
        name = 'Resource Cleanup'
        regex = '(Dispose|Close|disconnect|cleanup)'
        suggestion = 'Ensure proper resource cleanup'
        impact = 'high'
        category = 'reliability'
    }

    $patterns.monitoring += @{
        name = 'Telemetry'
        regex = '(trace|span|metric|log\.|logger\.)'
        suggestion = 'Implement proper telemetry'
        impact = 'high'
        category = 'observability'
    }

    return $patterns
}

Export-ModuleMember -Function Get-AdvancedPatterns
