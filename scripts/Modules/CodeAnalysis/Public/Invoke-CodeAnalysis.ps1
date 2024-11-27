# Custom validation attributes
class ValidPath : System.Management.Automation.ValidateArgumentsAttribute {
    [void]ValidateElement($element) {
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
    Default: @('.js', '.ts', '.py', '.ps1')

.PARAMETER BatchSize
    Number of files to process in each batch for parallel processing.
    Default: 100

.PARAMETER MaxParallelism
    Maximum number of parallel operations to run.
    Default: 8

.EXAMPLE
    Invoke-CodeAnalysis -Path ./src -OutputName "weekly-scan"
    Analyzes all supported files in ./src directory.

.EXAMPLE
    Invoke-CodeAnalysis -Path ./src -FileExtensions @('.js','.ts') -MaxParallelism 4
    Analyzes only JavaScript and TypeScript files with reduced parallelism.

.OUTPUTS
    Returns a hashtable containing analysis results with the following structure:
    {
        totalFiles = <int>
        languages = @{ <language> = <count> }
        patterns = @{
            total = <int>
            byCategory = @{ <category> = <count> }
        }
        security = @{
            averageScore = <float>
            highRiskFiles = @( <file paths> )
        }
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
        [string]$OutputName = (Get-Date -Format "yyyyMMdd-HHmmss"),
        
        [Parameter(Position = 2)]
        [ValidateSet('.js', '.ts', '.py', '.ps1', '.go')]
        [string[]]$FileExtensions = @('.js', '.ts', '.py', '.ps1'),
        
        [Parameter()]
        [ValidateRange(1, 1000)]
        [int]$BatchSize = 100,
        
        [Parameter()]
        [ValidateRange(1, 32)]
        [int]$MaxParallelism = 8
    )
    
    begin {
        try {
            # Load module configuration
            $moduleConfig = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json
            
            # Set up output paths
            $outputRoot = Join-Path $PSScriptRoot "../$($moduleConfig.paths.output.data)"
            $outputPath = Join-Path $outputRoot $OutputName
            
            Start-ScriptLogging -ScriptName "CodeAnalysis-$OutputName"
            Write-StructuredLog -Message "Starting code analysis" -Level INFO -Properties @{
                path = $Path
                outputPath = $outputPath
                extensions = $FileExtensions
            }
            
            # Create output directories
            $directories = @(
                $outputPath,
                "$outputPath/metrics",
                "$outputPath/patterns",
                "$outputPath/security",
                "$outputPath/recommendations"
            )
            
            foreach ($dir in $directories) {
                if (-not (Test-Path $dir)) {
                    New-Item -ItemType Directory -Path $dir -Force | Out-Null
                    Write-StructuredLog -Message "Created directory: $dir" -Level INFO
                }
            }
        }
        catch {
            $ex = [CodeAnalysisException]::new(
                "Failed to initialize analysis: $_",
                "Initialization"
            )
            Write-ErrorLog -ErrorRecord $ex
            throw $ex
        }
    }
    
    process {
        try {
            # Validate security preconditions
            if (-not (Test-SecurityPreconditions -Path $Path)) {
                throw [CodeAnalysisException]::new(
                    "Security validation failed for path: $Path",
                    "Security"
                )
            }
            
            # Process files
            $results = Invoke-LargeDirectoryProcessing -Path $Path -BatchSize $BatchSize -MaxParallelism $MaxParallelism -Include $FileExtensions -ProcessBlock {
                param($file)
                
                try {
                    $content = Get-Content $file -Raw
                    $language = Get-FileLanguage -Extension ([System.IO.Path]::GetExtension($file))
                    $patterns = Get-CodePatterns -FilePath $file -Content $content -Language $language
                    $metrics = Get-PatternMetrics -Patterns $patterns
                    $security = Get-SecurityScore -Path $file -Metrics $metrics
                    
                    return @{
                        file = $file
                        language = $language
                        patterns = $patterns
                        metrics = $metrics
                        security = $security
                    }
                }
                catch {
                    Write-ErrorLog $_
                    return $null
                }
            }
            
            if (-not $results -or $results.Count -eq 0) {
                throw [CodeAnalysisException]::new(
                    "No files were processed successfully",
                    "Processing"
                )
            }
            
            # Generate summary
            $summary = @{
                totalFiles = $results.Count
                languages = @{}
                patterns = @{
                    total = 0
                    byCategory = @{}
                }
                security = @{
                    averageScore = 0
                    highRiskFiles = @()
                }
                recommendations = @()
            }
            
            # Process results
            foreach ($result in $results.Values) {
                # Language stats
                if (-not $summary.languages.ContainsKey($result.language)) {
                    $summary.languages[$result.language] = 0
                }
                $summary.languages[$result.language]++
                
                # Pattern stats
                $summary.patterns.total += $result.metrics.totalPatterns
                foreach ($category in $result.metrics.categories.Keys) {
                    if (-not $summary.patterns.byCategory.ContainsKey($category)) {
                        $summary.patterns.byCategory[$category] = 0
                    }
                    $summary.patterns.byCategory[$category] += $result.metrics.categories[$category].count
                }
                
                # Security stats
                $summary.security.averageScore += $result.security
                if ($result.security -lt $moduleConfig.analysis.securityThresholds.medium) {
                    $summary.security.highRiskFiles += $result.file
                }
                
                # Generate recommendations
                if ($result.metrics.complexity -gt $moduleConfig.analysis.securityThresholds.high -or 
                    $result.security -lt $moduleConfig.analysis.securityThresholds.medium) {
                    $summary.recommendations += @{
                        file = $result.file
                        type = if ($result.metrics.complexity -gt $moduleConfig.analysis.securityThresholds.high) { "complexity" } else { "security" }
                        severity = if ($result.security -lt $moduleConfig.analysis.securityThresholds.low) { "high" } else { "medium" }
                        suggestions = @(
                            if ($result.metrics.complexity -gt $moduleConfig.analysis.securityThresholds.high) {
                                "Consider refactoring to reduce complexity"
                            }
                            if ($result.security -lt $moduleConfig.analysis.securityThresholds.medium) {
                                "Review security patterns and implement fixes"
                            }
                        )
                    }
                }
            }
            
            # Finalize averages
            if ($results.Count -gt 0) {
                $summary.security.averageScore = $summary.security.averageScore / $results.Count
            }
            
            # Export results
            $summary | ConvertTo-Json -Depth 10 | Out-File "$outputPath/summary.json"
            $results | ConvertTo-Json -Depth 10 | Out-File "$outputPath/details.json"
            
            # Load report template
            $reportTemplate = Get-Content "$PSScriptRoot/../$($moduleConfig.paths.templates.report)" -Raw
            
            # Replace placeholders
            $reportContent = $reportTemplate -replace '{{totalFiles}}', $summary.totalFiles `
                                          -replace '{{averageSecurityScore}}', ([Math]::Round($summary.security.averageScore, 2)) `
                                          -replace '{{totalPatterns}}', $summary.patterns.total
            
            # Generate language distribution section
            $languageSection = $summary.languages.GetEnumerator() | ForEach-Object {
                "- $($_.Key): $($_.Value)"
            }
            $reportContent = $reportContent -replace '{{#each languages}}[\s\S]*?{{/each}}', ($languageSection -join "`n")
            
            # Generate pattern categories section
            $patternSection = $summary.patterns.byCategory.GetEnumerator() | ForEach-Object {
                "- $($_.Key): $($_.Value)"
            }
            $reportContent = $reportContent -replace '{{#each patterns.byCategory}}[\s\S]*?{{/each}}', ($patternSection -join "`n")
            
            # Generate security section
            $securitySection = $summary.security.highRiskFiles | ForEach-Object {
                "- $_"
            }
            $reportContent = $reportContent -replace '{{#each security.highRiskFiles}}[\s\S]*?{{/each}}', ($securitySection -join "`n")
            
            # Generate recommendations section
            $recommendationSection = $summary.recommendations | ForEach-Object {
                @"
### $($_.file)
- Type: $($_.type)
- Severity: $($_.severity)
- Suggestions:
$(($_.suggestions | ForEach-Object { "  - $_" }) -join "`n")

"@
            }
            $reportContent = $reportContent -replace '{{#each recommendations}}[\s\S]*?{{/each}}', ($recommendationSection -join "`n")
            
            $reportContent | Out-File "$outputPath/report.md"
            
            Write-StructuredLog -Message "Analysis complete" -Level INFO -Properties @{
                totalFiles = $summary.totalFiles
                patterns = $summary.patterns.total
                recommendations = $summary.recommendations.Count
                outputPath = $outputPath
            }
            
            return @{
                summary = $summary
                outputPath = $outputPath
            }
        }
        catch {
            if ($_ -is [CodeAnalysisException]) {
                Write-ErrorLog $_
                throw
            }
            else {
                $ex = [CodeAnalysisException]::new(
                    "Analysis failed: $_",
                    "Processing"
                )
                Write-ErrorLog -ErrorRecord $ex
                throw $ex
            }
        }
    }
    
    end {
        Stop-ScriptLogging -ScriptName "CodeAnalysis-$OutputName"
    }
}

Export-ModuleMember -Function Invoke-CodeAnalysis
