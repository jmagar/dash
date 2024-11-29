# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1
. $PSScriptRoot/LanguageAnalyzer.ps1

function Get-AstAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [ValidateSet('typescript', 'javascript', 'powershell')]
        [string]$Language,
        [Parameter()]
        [hashtable]$Options = @{}
    )
    
    try {
        # Initialize logging if not already initialized
        if (-not $script:LogConfig) {
            Initialize-Logging | Out-Null
        }
        
        Write-StructuredLog -Message "Starting AST analysis" -Level INFO -Properties @{
            language = $Language
            contentLength = $Content.Length
        }
        
        # Initialize AST result
        $astResult = @{
            ast = @{
                nodes = @()
                structure = @{
                    depth = 0
                    breadth = 0
                    complexity = 0
                }
            }
            metrics = @{
                duration_ms = 0
                nodes_processed = 0
                memory_used_mb = 0
                language = $Language
            }
            issues = @()
            status = @{
                success = $true
                errors = @()
            }
        }
        
        $startTime = Get-Date
        
        # Get language-specific analysis
        $analysis = Get-CodeAnalysis -Content $Content -Language $Language
        if (-not $analysis) {
            throw "Failed to analyze code using language parser"
        }
        
        # Copy analysis results
        $astResult.ast = $analysis.ast ?? $analysis
        $astResult.issues = $analysis.issues
        
        # Update metrics
        $astResult.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            nodes_processed = $astResult.ast.nodes.Count
            memory_used_mb = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
            language = $Language
        }
        
        Write-StructuredLog -Message "AST analysis completed" -Level INFO -Properties @{
            language = $Language
            nodes = $astResult.ast.nodes.Count
            depth = $astResult.ast.structure.depth
            complexity = $astResult.ast.structure.complexity
            duration_ms = $astResult.metrics.duration_ms
            issues_found = $astResult.issues.Count
        }
        
        return $astResult
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze AST: $_" -Level ERROR
        return @{
            ast = @{
                nodes = @()
                structure = @{
                    depth = 0
                    breadth = 0
                    complexity = 0
                }
            }
            metrics = @{
                duration_ms = 0
                nodes_processed = 0
                memory_used_mb = 0
                language = $Language
            }
            issues = @()
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

Export-ModuleMember -Function Get-AstAnalysis
