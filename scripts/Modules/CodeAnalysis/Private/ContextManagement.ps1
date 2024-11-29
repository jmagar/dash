# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

# Initialize context store
$script:Context = @{
    Current = $null
    Stack = @()
}

function Push-AnalysisContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Context
    )
    
    try {
        # Initialize logging if not already initialized
        if (-not $script:LogConfig) {
            Initialize-Logging | Out-Null
        }
        
        Write-StructuredLog -Message "Pushing analysis context" -Level DEBUG
        
        # Store current context in stack
        if ($script:Context.Current) {
            $script:Context.Stack += $script:Context.Current
        }
        
        # Set new context
        $script:Context.Current = $Context
        
        return @{
            context = @{
                depth = $script:Context.Stack.Count
                current = $Context
            }
            status = @{
                success = $true
                errors = @()
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to push context: $_" -Level ERROR
        return @{
            context = $null
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

function Pop-AnalysisContext {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Popping analysis context" -Level DEBUG
        
        if ($script:Context.Stack.Count -eq 0) {
            throw "Context stack is empty"
        }
        
        # Get previous context
        $previousContext = $script:Context.Stack[-1]
        $script:Context.Stack = $script:Context.Stack[0..($script:Context.Stack.Count - 2)]
        
        # Update current context
        $script:Context.Current = $previousContext
        
        return @{
            context = @{
                depth = $script:Context.Stack.Count
                current = $previousContext
            }
            status = @{
                success = $true
                errors = @()
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to pop context: $_" -Level ERROR
        return @{
            context = $null
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

function Get-CurrentContext {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Getting current context" -Level DEBUG
        
        if (-not $script:Context.Current) {
            return @{
                context = $null
                status = @{
                    success = $true
                    errors = @()
                }
            }
        }
        
        return @{
            context = @{
                depth = $script:Context.Stack.Count
                current = $script:Context.Current
            }
            status = @{
                success = $true
                errors = @()
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to get context: $_" -Level ERROR
        return @{
            context = $null
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

function Clear-AnalysisContext {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Clearing analysis context" -Level INFO
        
        # Reset context store
        $script:Context = @{
            Current = $null
            Stack = @()
        }
        
        return @{
            context = @{
                cleared = $true
                timestamp = Get-Date
            }
            status = @{
                success = $true
                errors = @()
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to clear context: $_" -Level ERROR
        return @{
            context = $null
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

Export-ModuleMember -Function Push-AnalysisContext, Pop-AnalysisContext, Get-CurrentContext, Clear-AnalysisContext
