# Custom exceptions for code analysis
class CodeAnalysisException : Exception {
    [string]$Category
    
    CodeAnalysisException([string]$message, [string]$category) : base($message) {
        $this.Category = $category
    }
}

function Initialize-CodeAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [Parameter()]
        [string]$OutputPath = "$PSScriptRoot/../Output"
    )
    
    try {
        Write-Verbose "Initializing code analysis"
        
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        # Initialize components
        $initResult = @{
            dataStore = Initialize-DataStore
            index = Initialize-Index
            status = @{
                success = $true
                errors = @()
            }
        }
        
        if (-not $initResult.dataStore) {
            $initResult.status.success = $false
            $initResult.status.errors += "Failed to initialize data store"
        }
        
        if (-not $initResult.index) {
            $initResult.status.success = $false
            $initResult.status.errors += "Failed to initialize index"
        }
        
        if (-not $initResult.status.success) {
            throw ($initResult.status.errors -join "; ")
        }
        
        Write-Verbose "Code analysis initialized successfully"
        return $true
    }
    catch {
        Write-Error "Failed to initialize code analysis: $_"
        return $false
    }
}

function Invoke-CodeAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [ValidateScript({
            if (-not (Test-Path $_)) {
                throw "Path '$_' does not exist."
            }
            return $true
        })]
        [string]$Path,
        
        [Parameter(Position = 1)]
        [string]$OutputPath = "$PSScriptRoot/../Output",
        
        [Parameter(Position = 2)]
        [string]$AnalysisName = "code-analysis",
        
        [Parameter(Position = 3)]
        [ValidateSet('.js', '.ts', '.jsx', '.tsx', '.py', '.ps1', '.go')]
        [string[]]$FileExtensions = @('.js', '.ts', '.jsx', '.tsx', '.py', '.ps1', '.go'),
        
        [Parameter()]
        [int]$BatchSize = 100,
        
        [Parameter()]
        [int]$MaxParallelism = 8,
        
        [Parameter()]
        [switch]$SkipCache,
        
        [Parameter()]
        [switch]$Force,
        
        [Parameter()]
        [switch]$IncludeRefactoringSuggestions
    )
    
    begin {
        Write-Verbose "Starting analysis with Path: $Path"
        
        # Initialize code analysis
        if (-not (Initialize-CodeAnalysis -Path $Path -OutputPath $OutputPath)) {
            throw "Failed to initialize code analysis"
        }
        
        # Start resource monitoring
        $monitoringJob = Start-ResourceMonitoring
        
        # Initialize results collection
        $analysisResults = @{
            summary = @{
                totalFiles = 0
                processedFiles = 0
                totalScore = [decimal]0
                averageScore = [decimal]0
                patterns = @{
                    total = 0
                    byType = @{}
                }
                security = @{
                    total = 0
                    bySeverity = @{
                        critical = 0
                        high = 0
                        medium = 0
                        low = 0
                    }
                }
                performance = @{
                    total = 0
                    byMetric = @{
                        complexity = 0
                    }
                }
            }
            files = @()
            timestamp = Get-Date -Format "o"
        }
        
        # Ensure output directories exist
        if (-not (Test-Path $OutputPath)) {
            New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null
            Write-Verbose "Created output directory: $OutputPath"
        }
    }
    
    process {
        try {
            Write-Verbose "Processing path: $Path"
            
            # Get files to analyze
            $files = @(Get-ChildItem -Path $Path -Recurse -File |
                Where-Object { $FileExtensions -contains $_.Extension })
            
            Write-Verbose "Found $($files.Count) files to analyze"
            $analysisResults.summary.totalFiles = $files.Count
            
            # Process files
            foreach ($file in $files) {
                try {
                    # Get file content
                    $content = Get-Content $file.FullName -Raw
                    
                    # Skip empty files
                    if ([string]::IsNullOrWhiteSpace($content)) {
                        $fileAnalysis = @{
                            path = $file.FullName
                            language = 'unknown'
                            patterns = @()
                            security = @{
                                issues = @()
                                score = [int]100
                                statistics = @{
                                    total = 0
                                    bySeverity = @{
                                        critical = 0
                                        high = 0
                                        medium = 0
                                        low = 0
                                    }
                                }
                            }
                            performance = @{
                                metrics = @{
                                    complexity = 0
                                    lines = 0
                                    functions = 0
                                }
                                score = [int]100
                                hotspots = @()
                                recommendations = @()
                            }
                            timestamp = Get-Date -Format "o"
                        }
                        $analysisResults.files += $fileAnalysis
                        $analysisResults.summary.processedFiles++
                        continue
                    }
                    
                    # Determine language
                    $language = switch ($file.Extension.ToLower()) {
                        { $_ -in '.js', '.jsx' } { 'javascript' }
                        { $_ -in '.ts', '.tsx' } { 'typescript' }
                        '.py' { 'python' }
                        '.ps1' { 'powershell' }
                        '.go' { 'go' }
                        default { 'unknown' }
                    }
                    
                    # Analyze file
                    $fileAnalysis = @{
                        path = $file.FullName
                        language = $language
                        patterns = Get-CodePatterns -Content $content -Language $language
                        security = Get-SecurityIssues -Content $content -Language $language
                        performance = Get-PerformanceMetrics -Content $content -Language $language
                        timestamp = Get-Date -Format "o"
                    }
                    
                    # Add to results
                    $analysisResults.files += $fileAnalysis
                    $analysisResults.summary.processedFiles++
                    
                    # Update summary metrics
                    if ($fileAnalysis.security -and $fileAnalysis.performance) {
                        $securityScore = if ($null -ne $fileAnalysis.security.score) { 
                            [decimal]$fileAnalysis.security.score 
                        } else { 
                            [decimal]100 
                        }
                        
                        $performanceScore = if ($null -ne $fileAnalysis.performance.score) { 
                            [decimal]$fileAnalysis.performance.score 
                        } else { 
                            [decimal]100 
                        }
                        
                        # Calculate average score for the file
                        $fileScore = [Math]::Round(($securityScore + $performanceScore) / 2, 2)
                        $analysisResults.summary.totalScore += $fileScore
                    }
                }
                catch {
                    Write-Warning "Failed to analyze file $($file.FullName): $_"
                    continue
                }
            }
            
            # Calculate final average score
            if ($analysisResults.summary.processedFiles -gt 0) {
                $analysisResults.summary.averageScore = [Math]::Round(
                    $analysisResults.summary.totalScore / $analysisResults.summary.processedFiles,
                    2
                )
            }
            else {
                $analysisResults.summary.averageScore = [decimal]100
            }
            
            return $analysisResults
        }
        catch {
            Write-Error "Failed to process analysis: $_"
            throw
        }
    }
    
    end {
        if ($monitoringJob) {
            Stop-Job -Job $monitoringJob
            Remove-Job -Job $monitoringJob
        }
    }
}

Export-ModuleMember -Function Initialize-CodeAnalysis, Invoke-CodeAnalysis
