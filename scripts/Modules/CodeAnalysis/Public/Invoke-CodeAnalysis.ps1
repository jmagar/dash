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
        [string]$Language,
        [Parameter()]
        [hashtable]$Context
    )

    try {
        # Check if ML environment is initialized
        if (-not (Initialize-MLEnvironment)) {
            throw "Failed to initialize ML environment"
        }

        # Get code embedding
        $embedding = Get-CodeEmbedding -Code $Content -Context $Context
        if (-not $embedding) {
            throw "Failed to generate code embedding"
        }

        # Get pattern predictions
        $patternMatches = @()
        $modelTypes = @('pattern', 'security', 'performance')
        foreach ($modelType in $modelTypes) {
            $modelPath = Join-Path $script:Config.machineLearning.modelPath "$modelType-$Language.model"
            if (Test-Path $modelPath) {
                $predictions = Invoke-MLPrediction -Embedding $embedding -ModelPath $modelPath -Context $Context
                if ($predictions) {
                    foreach ($pred in $predictions) {
                        $patternMatches += [PSCustomObject]@{
                            Type = $modelType
                            Name = $pred.pattern
                            Confidence = $pred.confidence
                            Risk = $pred.risk
                            Suggestion = $pred.suggestion
                            Location = $pred.location
                        }
                    }
                }
            }
        }

        # Filter and sort patterns
        $patternMatches = $patternMatches | Where-Object { $_.Confidence -ge $script:Config.machineLearning.confidenceThreshold } |
                              Sort-Object -Property @{Expression = 'Risk'; Descending = $true}, 
                                                  @{Expression = 'Confidence'; Descending = $true}

        return @{
            Patterns = $patternMatches
            Metadata = @{
                Language = $Language
                ProcessedAt = (Get-Date).ToString('o')
                ModelVersion = (Get-Content (Join-Path $script:Config.machineLearning.modelPath "version.json") | 
                              ConvertFrom-Json).version
            }
        }
    }
    catch {
        Write-Error "ML prediction failed: $_"
        return $null
    }
}

function Invoke-MLPrediction {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [array]$Embedding,
        [Parameter(Mandatory)]
        [string]$ModelPath,
        [Parameter()]
        [hashtable]$Context
    )
    
    try {
        # Create Python script for prediction
        $pythonScript = @"
from sentence_transformers import SentenceTransformer
import torch
import json
import sys
import os
import gc

def load_model(model_path):
    try:
        model = SentenceTransformer(model_path)
        return model
    except Exception as e:
        print(json.dumps({'error': f"Failed to load model: {str(e)}"}), file=sys.stderr)
        return None

def predict(model, embedding):
    try:
        # Convert embedding to tensor
        embedding_tensor = torch.tensor(embedding).unsqueeze(0)
        
        # Get predictions
        with torch.no_grad():
            output = model(embedding_tensor)
            predictions = output.softmax(dim=1).tolist()[0]
        
        # Clean up GPU memory if available
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # Force garbage collection
        gc.collect()
        
        return predictions
    except Exception as e:
        print(json.dumps({'error': f"Failed to predict: {str(e)}"}), file=sys.stderr)
        return None

if __name__ == '__main__':
    embedding = json.loads(sys.argv[1])
    model_path = sys.argv[2]
    
    model = load_model(model_path)
    if not model:
        sys.exit(1)
    
    predictions = predict(model, embedding)
    if predictions:
        print(json.dumps({'predictions': predictions}))
        sys.exit(0)
    else:
        sys.exit(1)
"@
        
        # Create temporary files
        $tempScript = [Path]::GetTempFileName()
        $tempOutput = [Path]::GetTempFileName()
        $tempError = [Path]::GetTempFileName()
        
        try {
            $pythonScript | Set-Content $tempScript
            
            $pythonPath = Join-Path $script:Config.Python.EnvPath "Scripts/python"
            $process = Start-Process -FilePath $pythonPath -ArgumentList @(
                $tempScript,
                ($Embedding | ConvertTo-Json -Compress),
                $ModelPath
            ) -Wait -PassThru -RedirectStandardOutput $tempOutput -RedirectStandardError $tempError -NoNewWindow
            
            if ($process.ExitCode -ne 0) {
                $errorContent = Get-Content $tempError -Raw
                throw "ML prediction failed: $errorContent"
            }
            
            $result = Get-Content $tempOutput | ConvertFrom-Json
            
            # Map predictions to patterns
            $patternMapping = Get-Content (Join-Path (Split-Path $ModelPath) "pattern_mapping.json") | ConvertFrom-Json
            $predictions = @()
            
            for ($i = 0; $i -lt $result.predictions.Count; $i++) {
                if ($result.predictions[$i] -ge $script:Config.machineLearning.confidenceThreshold) {
                    $pattern = $patternMapping.patterns[$i]
                    $predictions += @{
                        pattern = $pattern.name
                        confidence = $result.predictions[$i]
                        risk = $pattern.risk
                        suggestion = $pattern.suggestion
                        location = $null  # Will be filled by pattern detection
                    }
                }
            }
            
            return $predictions
        }
        finally {
            # Cleanup temporary files
            Remove-Item $tempScript -ErrorAction SilentlyContinue
            Remove-Item $tempOutput -ErrorAction SilentlyContinue
            Remove-Item $tempError -ErrorAction SilentlyContinue
        }
    }
    catch {
        Write-Error "ML prediction failed: $_"
        return $null
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
                $refactoringTasks += Invoke-FileBatch -Files $currentBatch
                $currentBatch = @()
            }
        }
    }
    
    # Process remaining files
    if ($currentBatch.Count -gt 0) {
        $refactoringTasks += Invoke-FileBatch -Files $currentBatch
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

function Invoke-FileBatch {
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
        $monitoringJob = Start-ResourceMonitoring
        
        # Initialize results collection
        $script:results = @{
            summary = @{
                totalFiles = 0
                processedFiles = 0
                patterns = @{
                    total = 0
                    byType = @{}
                }
                security = @{
                    score = 100
                    issues = @()
                }
                performance = @{
                    averageComplexity = 0
                    hotspots = @()
                }
                refactoring = @{
                    suggestions = @()
                    priorities = @()
                }
            }
            files = @()
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
            if (-not $resolvedPath) {
                throw [CodeAnalysisException]::new("Invalid path: $Path", 'InvalidPath')
            }
            
            # Initialize data store
            Initialize-DataStore

            # Get files to analyze
            $excludePatterns = $script:Config.analysis.excludePatterns -join '|'
            $files = Get-ChildItem -Path $resolvedPath -Recurse -File |
                Where-Object { $_.FullName -notmatch $excludePatterns }

            Write-Verbose "Found $($files.Count) files to analyze"
            
            # Process files in batches
            $batchSize = $script:Config.analysis.batchSize
            $maxParallelism = $script:Config.analysis.maxParallelism
            Write-Verbose "Processing with batch size: $batchSize, parallelism: $maxParallelism"

            $script:results = @{
                summary = @{
                    totalFiles = $files.Count
                    processedFiles = 0
                    patterns = @{
                        total = 0
                        byType = @{}
                    }
                    security = @{
                        score = 100
                        issues = @()
                    }
                    performance = @{
                        averageComplexity = 0
                        hotspots = @()
                    }
                    refactoring = @{
                        suggestions = @()
                        priorities = @()
                    }
                }
                files = @()
            }

            foreach ($file in $files) {
                Write-Verbose "Processing file: $($file.FullName)"
                try {
                    # Check resource availability
                    if (-not (Test-ResourceAvailability)) {
                        Write-Warning "Resource threshold exceeded, reducing batch size"
                        continue
                    }

                    # Get file content and language
                    $content = Get-Content $file.FullName -Raw
                    $language = Get-FileLanguage -Extension $file.Extension
                    
                    # Check cache first
                    $cachedResult = Get-AnalysisData -FilePath $file.FullName -DataType 'analysis'
                    if ($cachedResult -and $cachedResult.analysis) {
                        Write-Verbose "Using cached analysis for $($file.FullName)"
                        $script:results.files += $cachedResult
                        $script:results.summary.processedFiles++

                        # Update summary metrics from cached data
                        foreach ($pattern in $cachedResult.analysis.patterns.Keys) {
                            $patternType = ($pattern -split '\.')[0]
                            if (-not $script:results.summary.patterns.byType.ContainsKey($patternType)) {
                                $script:results.summary.patterns.byType[$patternType] = 0
                            }
                            $script:results.summary.patterns.byType[$patternType] += $cachedResult.analysis.patterns[$pattern].occurrences
                            $script:results.summary.patterns.total += $cachedResult.analysis.patterns[$pattern].occurrences
                        }
                        continue
                    }

                    # Perform analysis
                    $fileAnalysis = @{
                        patterns = Get-CodePatterns -FilePath $file.FullName -Content $content -Language $language
                        security = @{
                            issues = @()
                            score = 100
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

                    $fileResult = @{
                        path = $file.FullName
                        analysis = $fileAnalysis
                    }

                    # Cache the results
                    Add-AnalysisData -FilePath $file.FullName -Data @{
                        Type = 'analysis'
                        Content = $fileAnalysis
                    }

                    $script:results.files += $fileResult
                    $script:results.summary.processedFiles++

                    # Update summary metrics
                    foreach ($pattern in $fileAnalysis.patterns.Keys) {
                        $patternType = ($pattern -split '\.')[0]
                        if (-not $script:results.summary.patterns.byType.ContainsKey($patternType)) {
                            $script:results.summary.patterns.byType[$patternType] = 0
                        }
                        $script:results.summary.patterns.byType[$patternType] += $fileAnalysis.patterns[$pattern].occurrences
                        $script:results.summary.patterns.total += $fileAnalysis.patterns[$pattern].occurrences
                    }

                    $script:results.summary.security.score = [Math]::Min(
                        $script:results.summary.security.score,
                        $fileAnalysis.security.score
                    )

                    if ($fileAnalysis.performance.complexity -gt 0) {
                        $script:results.summary.performance.hotspots += @{
                            file = $file.FullName
                            complexity = $fileAnalysis.performance.complexity
                        }
                    }
                }
                catch {
                    Write-Warning "Failed to analyze file $($file.FullName): $_"
                }
            }
            
            # Calculate final metrics
            if ($script:results.summary.processedFiles -gt 0) {
                $complexityValues = $script:results.files | ForEach-Object { $_.analysis.performance.complexity }
                $script:results.summary.performance.averageComplexity = ($complexityValues | Measure-Object -Average).Average
                
                $securityValues = $script:results.files | ForEach-Object { $_.analysis.security.score }
                $script:results.summary.security.averageScore = ($securityValues | Measure-Object -Average).Average
            }
            
            # Sort refactoring priorities
            $script:results.summary.refactoring.priorities = $script:results.summary.refactoring.priorities | 
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
            $script:results | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
            Write-Verbose "Analysis results saved to: $outputFile"
            
            # Also save a copy with a static name for easy access
            $latestFile = Join-Path $OutputPath "$AnalysisName-$targetPath-latest.json"
            Copy-Item -Path $outputFile -Destination $latestFile -Force
            Write-Verbose "Latest analysis saved to: $latestFile"
            
            if ($IncludeRefactoringSuggestions) {
                # Ensure database is initialized
                Assert-DatabaseInitialized
                
                # Get refactoring suggestions with AST and ML analysis
                $refactoringSuggestions = Get-DetailedRefactoringSuggestions -AnalysisResults $script:results
                
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
                    Results = $script:results
                    Suggestions = $refactoringSuggestions
                }
                Write-Verbose "Analysis stored in database with ID: $analysisId"
            }
            
            return $script:results
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
