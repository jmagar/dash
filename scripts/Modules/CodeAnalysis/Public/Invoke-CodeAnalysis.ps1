# Custom validation attributes
class ValidPath : System.Management.Automation.ValidateArgumentsAttribute {
    [void]Validate([object]$element) {
        if (-not (Test-Path $element)) {
            throw [CodeAnalysisException]::new(
                "Path '$element' does not exist",
                "InvalidPath"
            )
        }
    }
}

class CodeAnalysisException : Exception {
    [string]$Category
    
    CodeAnalysisException([string]$message, [string]$category) : base($message) {
        $this.Category = $category
    }
}

<#
.SYNOPSIS
    Performs comprehensive code analysis with pattern detection and security scanning.

.DESCRIPTION
    Analyzes source code files for patterns, complexity metrics, security issues, and generates
    detailed reports. The analysis includes:
    - Pattern detection for multiple languages
    - Security vulnerability scanning
    - Complexity metrics calculation
    - Dependency analysis
    - Code quality assessment

.PARAMETER Path
    The directory path containing source code to analyze. Must be a valid existing path.

.PARAMETER OutputName
    Name for this analysis run. Will be used to create a subdirectory in the module's
    Data/Analysis directory. Default is current timestamp.

.PARAMETER FileExtensions
    Array of file extensions to analyze. Supports common programming languages.
    Default: @('.js', '.ts', '.py', '.ps1', '.go')

.PARAMETER BatchSize
    Number of files to process in each batch for parallel processing.
    Default: 100

.PARAMETER MaxParallelism
    Maximum number of parallel operations to run.
    Default: 8

.PARAMETER SkipCache
    Switch to skip caching analysis results.

.PARAMETER Force
    Switch to force analysis even if resource thresholds are exceeded.

.EXAMPLE
    Invoke-CodeAnalysis -Path ./src -OutputName "weekly-scan"
    Analyzes all supported files in ./src directory.

.EXAMPLE
    Invoke-CodeAnalysis -Path ./src -FileExtensions @('.js','.ts') -MaxParallelism 4
    Analyzes only JavaScript and TypeScript files with reduced parallelism.

.OUTPUTS
    Returns a hashtable containing analysis results with the following structure:
    {
        summary = @{
            totalFiles = <int>
            analyzedFiles = <int>
            patterns = @{
                <pattern> = <count>
            }
            security = @{
                highSeverity = <int>
                mediumSeverity = <int>
                lowSeverity = <int>
                averageScore = <float>
            }
            performance = @{
                averageComplexity = <float>
                hotspots = @(
                    @{
                        file = <string>
                        complexity = <int>
                    }
                )
            }
        }
        files = @{
            <file> = @{
                patterns = @{
                    <pattern> = @{
                        count = <int>
                    }
                }
                security = @{
                    severity = <string>
                }
                performance = @{
                    complexity = <int>
                }
            }
        }
        timestamp = <string>
    }

.NOTES
    Requires PowerShell 5.1 or later
    Author: Dash Team
    Last Modified: 2024-02-07

.LINK
    https://github.com/your-org/dash/wiki/code-analysis
#>
function Invoke-CodeAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [ValidPath()]
        [string]$Path,
        
        [Parameter(Position = 1)]
        [string]$OutputName = [DateTime]::Now.ToString("yyyyMMdd_HHmmss"),
        
        [Parameter(Position = 2)]
        [ValidateSet('.js', '.ts', '.py', '.ps1', '.go')]
        [string[]]$FileExtensions = @('.js', '.ts', '.py', '.ps1', '.go'),
        
        [Parameter()]
        [switch]$SkipCache,
        
        [Parameter()]
        [switch]$Force
    )
    
    begin {
        # Start resource monitoring
        $monitoringJob = Start-ResourceMonitoring -IntervalSeconds 5
        
        # Ensure output directories exist
        $outputPath = Join-Path $PSScriptRoot "../Data/Analysis/$OutputName"
        if (-not (Test-Path $outputPath)) {
            New-Item -Path $outputPath -ItemType Directory -Force | Out-Null
        }
        
        # Initialize results collection
        $results = @{
            summary = @{
                totalFiles = 0
                analyzedFiles = 0
                patterns = @{}
                security = @{
                    highSeverity = 0
                    mediumSeverity = 0
                    lowSeverity = 0
                    averageScore = 0
                }
                performance = @{
                    averageComplexity = 0
                    hotspots = @()
                }
            }
            files = @{}
            timestamp = [DateTime]::UtcNow.ToString('o')
        }
    }
    
    process {
        try {
            # Validate security preconditions
            if (-not (Test-SecurityPreconditions -Path $Path)) {
                throw [CodeAnalysisException]::new(
                    "Security validation failed for path: $Path",
                    "SecurityValidation"
                )
            }
            
            # Get all files to analyze
            $files = Get-ChildItem -Path $Path -Recurse -File |
                Where-Object { $FileExtensions -contains $_.Extension }
            
            $results.summary.totalFiles = $files.Count
            
            # Get optimal batch size and parallelism
            $batchSize = Get-OptimalBatchSize -TotalItems $files.Count
            $maxParallelism = Get-OptimalParallelism
            
            Write-Verbose "Processing with batch size: $batchSize, parallelism: $maxParallelism"
            
            # Process files in parallel with resource monitoring
            $processedFiles = Invoke-LargeDirectoryProcessing -Path $Path `
                -Include $FileExtensions `
                -BatchSize $batchSize `
                -MaxParallelism $maxParallelism `
                -ProcessBlock {
                    param($file)
                    
                    try {
                        # Check resource availability
                        if (-not (Test-ResourceAvailability)) {
                            Write-Warning "Resource threshold exceeded, reducing batch size"
                            return $null
                        }
                        
                        # Try to get from cache if enabled
                        if (-not $SkipCache) {
                            $cacheKey = New-CacheKey -FilePath $file -AnalysisType "Full"
                            $cachedResults = Get-CacheItem -Key $cacheKey
                            if ($cachedResults) {
                                Write-Verbose "Retrieved analysis from cache for $file"
                                return $cachedResults
                            }
                        }
                        
                        # Perform analysis
                        $content = Get-Content $file -Raw
                        $language = Get-FileLanguage -Extension $file.Extension
                        
                        $fileAnalysis = @{
                            patterns = Get-CodePatterns -FilePath $file -Content $content -Language $language
                            security = Get-SecurityIssues -FilePath $file -Content $content -Language $language
                            performance = Get-PerformanceMetrics -FilePath $file -Content $content -Language $language
                        }
                        
                        # Cache results if enabled
                        if (-not $SkipCache) {
                            Set-CacheItem -Key $cacheKey -Data $fileAnalysis
                        }
                        
                        return $fileAnalysis
                    }
                    catch {
                        Write-Error "Failed to analyze file $file : $_"
                        return $null
                    }
                }
            
            # Update results
            foreach ($file in $processedFiles.GetEnumerator()) {
                $results.files[$file.Key] = $file.Value
                $results.summary.analyzedFiles++
                
                # Update pattern statistics
                foreach ($pattern in $file.Value.patterns.Keys) {
                    if (-not $results.summary.patterns[$pattern]) {
                        $results.summary.patterns[$pattern] = 0
                    }
                    $results.summary.patterns[$pattern] += $file.Value.patterns[$pattern].Count
                }
                
                # Update security statistics
                switch ($file.Value.security.severity) {
                    'high' { $results.summary.security.highSeverity++ }
                    'medium' { $results.summary.security.mediumSeverity++ }
                    'low' { $results.summary.security.lowSeverity++ }
                }
                
                # Update performance statistics
                if ($file.Value.performance.complexity -gt 10) {
                    $results.summary.performance.hotspots += @{
                        file = $file.Key
                        complexity = $file.Value.performance.complexity
                    }
                }
            }
            
            # Calculate averages
            if ($results.summary.analyzedFiles -gt 0) {
                $results.summary.security.averageScore = (
                    ($results.summary.security.highSeverity * 100) +
                    ($results.summary.security.mediumSeverity * 50) +
                    ($results.summary.security.lowSeverity * 25)
                ) / $results.summary.analyzedFiles
                
                $results.summary.performance.averageComplexity = (
                    $results.files.Values.performance.complexity | Measure-Object -Average
                ).Average
            }
            
            # Export results
            $results | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $outputPath "analysis.json")
            
            # Generate reports
            Export-AnalysisReports -Results $results -OutputPath $outputPath
            
            return $results
        }
        catch {
            Write-Error "Analysis failed: $_"
            throw
        }
    }
    
    end {
        # Stop resource monitoring
        if ($monitoringJob) {
            Stop-ResourceMonitoring -Job $monitoringJob
        }
    }
}

Export-ModuleMember -Function Invoke-CodeAnalysis
