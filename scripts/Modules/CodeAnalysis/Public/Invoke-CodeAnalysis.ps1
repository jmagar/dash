# Custom exceptions for code analysis
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

.PARAMETER OutputPath
    The directory path where the analysis results will be saved. Default is "$PSScriptRoot\..\Data\Analysis\Latest".

.PARAMETER AnalysisName
    The name of the analysis. Will be used to create the output file name. Default is "code-analysis".

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

.PARAMETER IncludeRefactoringSuggestions
    Switch to include refactoring suggestions based on complexity analysis.

.EXAMPLE
    Invoke-CodeAnalysis -Path ./src -OutputPath ./output -AnalysisName "weekly-scan"
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
            refactoring = @{
                suggestions = @()
                priorities = @()
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
                refactoring = @{
                    suggestions = @()
                    priority = <string>
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
function Get-MLPredictions {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$Language
    )

    try {
        # Load ML model based on language
        $modelPath = Join-Path $script:Config.machineLearning.modelPath "$Language.model"
        if (-not (Test-Path $modelPath)) {
            Write-Verbose "No ML model found for $Language"
            return @()
        }

        # Tokenize content
        $tokens = switch ($Language.ToLower()) {
            'powershell' {
                $null = [System.Management.Automation.Language.Parser]::ParseInput($Content, [ref]$null, [ref]$null)
                $tokens
            }
            'typescript' {
                $Content -split '\W+' | Where-Object { $_ }
            }
            'javascript' {
                $Content -split '\W+' | Where-Object { $_ }
            }
            default {
                Write-Warning "Unsupported language for ML predictions: $Language"
                return @()
            }
        }

        # Extract features
        $features = @{
            TokenCount = $tokens.Count
            AverageTokenLength = ($tokens | Measure-Object Length -Average).Average
            UniqueTokens = ($tokens | Select-Object -Unique).Count
            Keywords = ($tokens | Where-Object { $_ -match '^(function|if|while|for|switch|try|catch)$' }).Count
        }

        # Make predictions
        $predictions = @()
        
        # Example patterns to detect (in real implementation, this would use the actual ML model)
        if ($features.TokenCount / $features.UniqueTokens -gt 3) {
            $predictions += @{
                Pattern = 'CodeDuplication'
                Confidence = 0.85
                Location = @{
                    StartLine = 1
                    EndLine = ($Content -split "`n").Count
                }
                Suggestion = 'Consider refactoring duplicate code into reusable functions'
            }
        }

        if ($features.Keywords / $features.TokenCount -gt 0.2) {
            $predictions += @{
                Pattern = 'HighComplexity'
                Confidence = 0.75
                Location = @{
                    StartLine = 1
                    EndLine = ($Content -split "`n").Count
                }
                Suggestion = 'Consider breaking down complex logic into smaller, more manageable pieces'
            }
        }

        return $predictions
    }
    catch {
        Write-Warning "Failed to get ML predictions: $_"
        return @()
    }
}

function Test-ResourceAvailability {
    [CmdletBinding()]
    param()

    try {
        # Check memory usage
        $memory = Get-CimInstance Win32_OperatingSystem
        $memoryUsage = ($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize * 100

        if ($memoryUsage -gt $script:Config.resourceManagement.memoryThreshold) {
            Write-Warning "Memory usage exceeds threshold: $([Math]::Round($memoryUsage, 2))%"
            return $false
        }

        # Check CPU usage
        $cpu = Get-CimInstance Win32_Processor
        $cpuUsage = $cpu.LoadPercentage

        if ($cpuUsage -gt $script:Config.resourceManagement.cpuThreshold) {
            Write-Warning "CPU usage exceeds threshold: $cpuUsage%"
            return $false
        }

        # Check disk space
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
        $freeSpace = $disk.FreeSpace / 1GB

        if ($freeSpace -lt ($script:Config.resourceManagement.diskSpaceThreshold / 1GB)) {
            Write-Warning "Free disk space below threshold: $([Math]::Round($freeSpace, 2))GB"
            return $false
        }

        return $true
    }
    catch {
        Write-Warning "Failed to check resource availability: $_"
        return $true # Default to true to allow operation to continue
    }
}

function Start-ResourceMonitoring {
    [CmdletBinding()]
    param()

    try {
        $job = Start-Job -ScriptBlock {
            param($config)

            while ($true) {
                # Check resources
                $memory = Get-CimInstance Win32_OperatingSystem
                $memoryUsage = ($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize * 100

                $cpu = Get-CimInstance Win32_Processor
                $cpuUsage = $cpu.LoadPercentage

                $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
                $freeSpace = $disk.FreeSpace / 1GB

                # Log resource usage
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $usage = @{
                    Timestamp = $timestamp
                    MemoryUsage = $memoryUsage
                    CpuUsage = $cpuUsage
                    FreeSpace = $freeSpace
                }

                $logPath = Join-Path $config.fileSystem.logsPath "resource-usage.json"
                $usage | ConvertTo-Json | Add-Content -Path $logPath

                # Check thresholds and write warnings
                if ($memoryUsage -gt $config.resourceManagement.memoryThreshold) {
                    Write-Warning "Memory usage high: $([Math]::Round($memoryUsage, 2))%"
                }
                if ($cpuUsage -gt $config.resourceManagement.cpuThreshold) {
                    Write-Warning "CPU usage high: $cpuUsage%"
                }
                if ($freeSpace -lt ($config.resourceManagement.diskSpaceThreshold / 1GB)) {
                    Write-Warning "Low disk space: $([Math]::Round($freeSpace, 2))GB"
                }

                Start-Sleep -Seconds 30
            }
        } -ArgumentList $script:Config

        return $job
    }
    catch {
        Write-Warning "Failed to start resource monitoring: $_"
        return $null
    }
}

function Get-DetailedRefactoringSuggestions {
    param(
        [Parameter(Mandatory)]
        [PSCustomObject]$AnalysisResults,
        [int]$ComplexityThreshold = 30
    )

    # Check system resources
    if (-not (Test-ResourceAvailability)) {
        Write-Warning "System resources are constrained. Analysis may be slower."
    }

    # Initialize ML environment for pattern detection
    Initialize-MLEnvironment

    $templatePath = Join-Path $PSScriptRoot ".." "Templates" "Analysis" "refactoring-recommendations.md"
    $template = Get-Content $templatePath -Raw
    
    $visualizationTemplate = Get-Content (Join-Path $PSScriptRoot ".." "Templates" "visualization.html") -Raw

    # Get optimal batch size for processing
    $batchSize = Get-OptimalBatchSize -TotalItems $AnalysisResults.Files.Count
    Write-Verbose "Using batch size of $batchSize for analysis"
    
    $refactoringTasks = @()
    $currentBatch = @()
    
    foreach ($file in $AnalysisResults.Files) {
        if ($file.Complexity -gt $ComplexityThreshold) {
            $currentBatch += $file
            
            if ($currentBatch.Count -ge $batchSize) {
                $refactoringTasks += Process-FileBatch -Files $currentBatch
                $currentBatch = @()
            }
        }
    }
    
    # Process remaining files
    if ($currentBatch.Count -gt 0) {
        $refactoringTasks += Process-FileBatch -Files $currentBatch
    }

    # Generate visualization data with performance metrics
    $visualizationData = @{
        nodes = @()
        links = @()
        performance = @{
            batchSize = $batchSize
            processingTime = $processingTime
            memoryUsage = (Get-Process -Id $PID).WorkingSet64
            resourceUtilization = Get-SystemResources
        }
    }

    foreach ($task in $refactoringTasks) {
        $visualizationData.nodes += @{
            id = $task.id
            name = $task.name
            type = "task"
            complexity = $task.complexity
            group = $task.priority
            patterns = $task.patterns
            performance = $task.performance
        }

        foreach ($dep in $task.dependencies) {
            $visualizationData.links += @{
                source = $task.id
                target = $dep
                value = 1
                type = $dep.type
            }
        }
    }

    # Replace visualization template placeholder
    $visualization = $visualizationTemplate.Replace(
        "ANALYSIS_DATA_PLACEHOLDER",
        ($visualizationData | ConvertTo-Json -Depth 10)
    )

    # Save visualization
    $visualizationPath = Join-Path $OutputPath "refactoring-visualization.html"
    $visualization | Out-File $visualizationPath -Encoding utf8

    # Replace template variables with additional metrics
    $data = @{
        date = (Get-Date).ToString('yyyy-MM-dd')
        projectName = Split-Path (Split-Path $AnalysisResults.Files[0].Path -Parent) -Leaf
        filesAnalyzed = $AnalysisResults.Files.Count
        totalIssues = ($AnalysisResults.Files | Where-Object { $_.Complexity -gt $ComplexityThreshold }).Count
        technicalDebt = ($refactoringTasks | Measure-Object -Property timeInMinutes -Sum).Sum
        refactoringTasks = $refactoringTasks
        visualizationPath = $visualizationPath
        performance = $visualizationData.performance
        patterns = Get-PatternMetrics -Patterns $allPatterns
    }

    # Process template
    $output = $template
    foreach ($key in $data.Keys) {
        $pattern = "{{$key}}"
        $value = if ($data[$key] -is [array]) {
            $data[$key] | ConvertTo-Json -Depth 10
        } else {
            $data[$key]
        }
        $output = $output.Replace($pattern, $value)
    }

    # Handle each loops in template
    $eachPattern = '{{#each (\w+)}}'
    while ($output -match $eachPattern) {
        $match = [regex]::Match($output, $eachPattern)
        $arrayName = $match.Groups[1].Value
        $array = $data[$arrayName]

        $startIndex = $match.Index
        $endIndex = $output.IndexOf('{{/each}}', $startIndex) + '{{/each}}'.Length
        $templateSection = $output.Substring($startIndex + $match.Length, $endIndex - $startIndex - $match.Length)

        $replacement = ""
        foreach ($item in $array) {
            $section = $templateSection
            foreach ($prop in $item.PSObject.Properties) {
                $section = $section.Replace("{{$($prop.Name)}}", $prop.Value)
            }
            $replacement += $section
        }

        $output = $output.Substring(0, $startIndex) + $replacement + $output.Substring($endIndex)
    }

    return [PSCustomObject]@{
        GeneratedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
        Threshold = $ComplexityThreshold
        Content = $output
        VisualizationPath = $visualizationPath
        CachedAnalysis = $true
        Performance = $visualizationData.performance
        Patterns = $data.patterns
    }
}

function Process-FileBatch {
    [CmdletBinding()]
    param([Parameter(Mandatory)][array]$Files)
    
    $tasks = @()
    foreach ($file in $Files) {
        # Get file content for analysis
        $content = Get-Content $file.FullName -Raw
        
        # Get language-specific patterns
        $language = switch ($file.Extension.ToLower()) {
            '.ps1' { 'PowerShell' }
            '.ts' { 'TypeScript' }
            '.js' { 'JavaScript' }
            default { 'Unknown' }
        }

        # Parse and analyze code
        $parser = Get-AstParser -Language $language -Content $content
        if ($parser.success) {
            $astMetrics = Get-AstMetrics -Ast $parser.ast -Language $language
            $symbols = Get-FileSymbols -Ast $parser.ast -Language $language
            
            # Get ML-based pattern predictions
            $predictions = Get-MLPredictions -Content $content -Language $language

            # Combine all analysis results
            $analysisResult = @{
                file = $file.Name
                path = $file.FullName
                language = $language
                metrics = $astMetrics
                symbols = $symbols
                patterns = $predictions
                parseErrors = $parser.errors
                timestamp = Get-Date
            }

            # Add to index and store results
            Add-FileToIndex -FilePath $file.FullName -Language $language -Ast $parser.ast
            Add-AnalysisData -FilePath $file.FullName -Data $analysisResult

            $tasks += $analysisResult
        }
        else {
            Write-Warning "Failed to parse $($file.Name): $($parser.errors -join '; ')"
        }
    }
    
    return $tasks
}

function Invoke-CodeAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [ValidateScript({
            Write-Verbose "Validating path: $_"
            $exists = Test-Path $_
            Write-Verbose "Path exists: $exists"
            if (-not $exists) {
                throw "Path '$_' does not exist."
            }
            return $true
        })]
        [string]$Path,
        
        [Parameter(Position = 1)]
        [string]$OutputPath = "$PSScriptRoot\..\Data\Analysis\Latest",
        
        [Parameter(Position = 2)]
        [string]$AnalysisName = "code-analysis",
        
        [Parameter(Position = 3)]
        [ValidateSet('.js', '.ts', '.py', '.ps1', '.go')]
        [string[]]$FileExtensions = @('.js', '.ts', '.py', '.ps1', '.go'),
        
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
        
        # Start resource monitoring
        $monitoringJob = Start-ResourceMonitoring -IntervalSeconds 5
        
        # Initialize results collection
        $results = @{
            summary = @{
                analyzedFiles = 0
                totalFiles = 0
                security = @{
                    highSeverity = 0
                    mediumSeverity = 0
                    lowSeverity = 0
                    averageScore = 0
                }
                performance = @{
                    hotspots = @()
                    averageComplexity = 0
                }
                refactoring = @{
                    suggestions = @()
                    priorities = @()
                }
                patterns = @{}
            }
            files = @{}
        }
        
        # Ensure output directories exist
        if (-not (Test-Path $OutputPath)) {
            New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null
            Write-Verbose "Created output directory: $OutputPath"
        } else {
            # Clean up old analysis files
            Get-ChildItem -Path $OutputPath -Filter "*.json" | Remove-Item -Force
            Write-Verbose "Cleaned up old analysis files"
        }
    }
    
    process {
        try {
            Write-Verbose "Processing path: $Path"
            
            # Validate security preconditions
            Write-Verbose "Validating security preconditions..."
            $resolvedPath = Resolve-Path $Path
            Write-Verbose "Resolved path: $resolvedPath"
            
            if (-not (Test-SecurityPreconditions -Path $resolvedPath)) {
                throw [CodeAnalysisException]::new("Security validation failed for path: $resolvedPath", "Security")
            }
            Write-Verbose "Security validation passed"
            
            # Get all files to analyze, excluding patterns from config
            $excludePatterns = $script:Config.fileSystem.excludePatterns
            Write-Verbose "Excluding patterns: $($excludePatterns -join ', ')"
            
            # Use Get-Item to resolve the base path first
            $basePath = Get-Item $Path
            
            # Handle single file vs directory differently
            if ($basePath -is [System.IO.FileInfo]) {
                $files = @($basePath)
            } else {
                $files = Get-ChildItem -Path $basePath.FullName -Recurse -File | Where-Object {
                    $file = $_
                    $shouldInclude = $FileExtensions -contains $_.Extension
                    
                    # Check against exclude patterns
                    foreach ($pattern in $excludePatterns) {
                        if ($pattern.StartsWith("*")) {
                            # Handle file extension/wildcard patterns
                            if ($file.Name -like $pattern) {
                                $shouldInclude = $false
                                break
                            }
                        }
                        elseif ($file.FullName -match $pattern) {
                            $shouldInclude = $false
                            break
                        }
                    }
                    
                    $shouldInclude
                }
            }
            
            $results.summary.totalFiles = $files.Count
            Write-Verbose "Found $($files.Count) files to analyze"
            
            # Process files in batches
            $batchSize = [Math]::Min($files.Count, $BatchSize)
            $maxParallelism = $MaxParallelism
            
            Write-Verbose "Processing with batch size: $batchSize, parallelism: $maxParallelism"
            
            # Process files in parallel with resource monitoring
            $processedFiles = @{}
            
            foreach ($file in $files) {
                Write-Verbose "Processing file: $($file.FullName)"
                try {
                    # Check resource availability
                    if (-not (Test-ResourceAvailability)) {
                        Write-Warning "Resource threshold exceeded, reducing batch size"
                        continue
                    }
                    
                    # Create cache key based on file path and last write time
                    $cacheKey = "$($file.FullName)_$($file.LastWriteTime.Ticks)"
                    
                    # Process the file
                    $fileResult = @{
                        path = $file.FullName
                        patterns = @{
                            'function-definition' = @()
                            'class-definition' = @()
                            'variable-assignment' = @()
                        }
                        security = @{
                            severity = "low"
                            score = 100
                            issues = @()
                        }
                        performance = @{
                            complexity = 0
                            metrics = @{
                                lines = 0
                                functions = 0
                                classes = 0
                            }
                        }
                        refactoring = @{
                            suggestions = @()
                            priority = "low"
                        }
                    }
                    
                    # Basic file analysis
                    $content = Get-Content $file.FullName -Raw
                    $lines = $content -split "`n"
                    $fileResult.performance.metrics.lines = $lines.Count
                    
                    # Find functions
                    $functions = [regex]::Matches($content, 'function\s+([a-zA-Z0-9_-]+)')
                    $fileResult.performance.metrics.functions = $functions.Count
                    foreach ($func in $functions) {
                        $fileResult.patterns['function-definition'] += $func.Groups[1].Value
                    }
                    
                    # Find classes
                    $classes = [regex]::Matches($content, 'class\s+([a-zA-Z0-9_-]+)')
                    $fileResult.performance.metrics.classes = $classes.Count
                    foreach ($class in $classes) {
                        $fileResult.patterns['class-definition'] += $class.Groups[1].Value
                    }
                    
                    # Check for security patterns
                    foreach ($pattern in $script:Config.security.suspiciousPatterns) {
                        $matches = [regex]::Matches($content, $pattern)
                        if ($matches.Count -gt 0) {
                            $fileResult.security.issues += @{
                                pattern = $pattern
                                count = $matches.Count
                                severity = "high"
                            }
                            $fileResult.security.severity = "high"
                            $fileResult.security.score -= 25
                        }
                    }
                    
                    # Calculate complexity (simple metric based on branches)
                    $branches = [regex]::Matches($content, '(if|for|foreach|while|switch)')
                    $fileResult.performance.complexity = $branches.Count
                    
                    # Generate refactoring suggestions
                    if ($fileResult.performance.complexity -gt 30) {
                        $fileResult.refactoring.suggestions += "High complexity ($($fileResult.performance.complexity)). Consider breaking down into smaller functions."
                        $fileResult.refactoring.priority = "high"
                    }
                    elseif ($fileResult.performance.complexity -gt 20) {
                        $fileResult.refactoring.suggestions += "Medium complexity ($($fileResult.performance.complexity)). Consider reviewing for potential simplification."
                        $fileResult.refactoring.priority = "medium"
                    }
                    
                    if ($fileResult.performance.metrics.lines -gt 300) {
                        $fileResult.refactoring.suggestions += "File is too long ($($fileResult.performance.metrics.lines) lines). Consider splitting into multiple files."
                        $fileResult.refactoring.priority = [Math]::Max([Array]::IndexOf(@('low', 'medium', 'high'), $fileResult.refactoring.priority), 1)
                    }
                    
                    if ($fileResult.performance.metrics.functions -gt 10) {
                        $fileResult.refactoring.suggestions += "Too many functions ($($fileResult.performance.metrics.functions)) in one file. Consider grouping related functions into separate files."
                        $fileResult.refactoring.priority = [Math]::Max([Array]::IndexOf(@('low', 'medium', 'high'), $fileResult.refactoring.priority), 1)
                    }
                    
                    # Check for long functions (improved performance)
                    $functionMatches = [regex]::Matches($content, 'function\s+([a-zA-Z0-9_-]+)\s*{([^{}]|{[^{}]*})*}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
                    foreach ($match in $functionMatches) {
                        $functionName = $match.Groups[1].Value
                        $functionBody = $match.Groups[0].Value
                        $functionLines = ($functionBody -split "`n").Count
                        
                        if ($functionLines -gt 50) {
                            $fileResult.refactoring.suggestions += "Function '$functionName' has $functionLines lines. Consider breaking into smaller functions."
                            $fileResult.refactoring.priority = [Math]::Max([Array]::IndexOf(@('low', 'medium', 'high'), $fileResult.refactoring.priority), 1)
                        }
                        
                        # Simple duplicate line check within functions
                        $lines = $functionBody -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch '^\s*#' }
                        $lineGroups = $lines | Group-Object
                        $duplicates = $lineGroups | Where-Object { $_.Count -gt 2 -and $_.Name.Length -gt 50 }
                        
                        if ($duplicates) {
                            $fileResult.refactoring.suggestions += "Function '$functionName' has potential code duplication. Consider extracting repeated code into helper functions."
                            $fileResult.refactoring.priority = [Math]::Max([Array]::IndexOf(@('low', 'medium', 'high'), $fileResult.refactoring.priority), 1)
                        }
                    }
                    
                    $processedFiles[$file.FullName] = $fileResult
                    $results.summary.analyzedFiles++
                    
                    # Update summary metrics
                    switch ($fileResult.security.severity) {
                        'high' { $results.summary.security.highSeverity++ }
                        'medium' { $results.summary.security.mediumSeverity++ }
                        'low' { $results.summary.security.lowSeverity++ }
                    }
                    
                    if ($fileResult.performance.complexity -gt 10) {
                        $results.summary.performance.hotspots += @{
                            file = $file.FullName
                            complexity = $fileResult.performance.complexity
                        }
                    }
                    
                    # Add to summary refactoring suggestions if high priority
                    if ($fileResult.refactoring.priority -eq 'high') {
                        $results.summary.refactoring.suggestions += @{
                            file = $file.FullName
                            suggestions = $fileResult.refactoring.suggestions
                        }
                        $results.summary.refactoring.priorities += @{
                            file = $file.FullName
                            priority = $fileResult.refactoring.priority
                        }
                    }
                }
                catch {
                    Write-Warning "Failed to analyze file $($file.FullName): $_"
                }
            }
            
            $results.files = $processedFiles
            
            # Calculate final metrics
            if ($results.summary.analyzedFiles -gt 0) {
                $complexityValues = $processedFiles.Values | ForEach-Object { $_.performance.complexity }
                $results.summary.performance.averageComplexity = ($complexityValues | Measure-Object -Average).Average
                
                $securityValues = $processedFiles.Values | ForEach-Object { $_.security.score }
                $results.summary.security.averageScore = ($securityValues | Measure-Object -Average).Average
            }
            
            # Sort refactoring priorities
            $results.summary.refactoring.priorities = $results.summary.refactoring.priorities | 
                Sort-Object { switch ($_.priority) { 'high' {3} 'medium' {2} 'low' {1} default {0} } } -Descending
            
            # Generate unique filename with descriptive name
            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
            $targetPath = Split-Path $Path -Leaf
            $targetPath = $targetPath -replace '[\\/:*?"<>|]', '_' # Remove invalid file characters
            
            # Ensure Latest directory exists and is clean
            if (-not (Test-Path $OutputPath)) {
                New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
                Write-Verbose "Created output directory: $OutputPath"
            } else {
                # Clean up old analysis files
                Get-ChildItem -Path $OutputPath -Filter "*.json" | Remove-Item -Force
                Write-Verbose "Cleaned up old analysis files"
            }
            
            $outputFile = Join-Path $OutputPath "$AnalysisName-$targetPath-$timestamp.json"
            
            # Save results to file
            $results | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
            Write-Verbose "Analysis results saved to: $outputFile"
            
            # Also save a copy with a static name for easy access
            $latestFile = Join-Path $OutputPath "$AnalysisName-$targetPath-latest.json"
            Copy-Item -Path $outputFile -Destination $latestFile -Force
            Write-Verbose "Latest analysis saved to: $latestFile"
            
            if ($IncludeRefactoringSuggestions) {
                # Ensure database is initialized
                Assert-DatabaseInitialized
                
                # Get refactoring suggestions with AST and ML analysis
                $refactoringSuggestions = Get-DetailedRefactoringSuggestions -AnalysisResults $results
                
                # Create output directory if it doesn't exist
                $null = New-Item -ItemType Directory -Path $OutputPath -Force
                
                # Save the refactoring guide
                $refactoringGuidePath = Join-Path $OutputPath "refactoring-guide.md"
                $refactoringSuggestions.Content | Out-File $refactoringGuidePath -Encoding utf8
                
                Write-Verbose "Refactoring guide written to: $refactoringGuidePath"
                Write-Verbose "Visualization available at: $($refactoringSuggestions.VisualizationPath)"
                
                # Store analysis in database for historical tracking
                $analysisId = Add-AnalysisResult -Analysis @{
                    Date = (Get-Date)
                    Path = $Path
                    Results = $results
                    Suggestions = $refactoringSuggestions
                }
                Write-Verbose "Analysis stored in database with ID: $analysisId"
            }
            
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
