using namespace System.Collections.Concurrent
using namespace System.IO

# Import logging module
. "$PSScriptRoot/logging.ps1"

# Import core analysis functions
. "./analyze.ps1"
. "./analyze-patterns.ps1"

# Start logging
Start-ScriptLogging -ScriptName "analyze-refactoring.ps1" -UseScriptSpecificLog

try {
    Write-Log "Starting refactoring analysis" -Level INFO
    
    <#
.SYNOPSIS
    Identifies a refactoring opportunity in code files.
.DESCRIPTION
    Analyzes code files to identify potential refactoring opportunities based on pattern matching and metrics.
    Returns recommendations for improving code quality and maintainability.
.PARAMETER Path
    The path to search for files. Can be a directory or specific file.
.PARAMETER FileExtensions
    Array of file extensions to analyze (e.g., '.cs', '.js', '.ps1').
.PARAMETER PatternDatabase
    Optional path to a pattern database file. If not provided, uses default patterns.
.OUTPUTS
    Hashtable containing refactoring recommendations, metrics, and impact analysis.
#>
function Get-RefactoringOpportunity {
    [CmdletBinding()]
    [OutputType([System.Collections.Hashtable])]
    param(
        [Parameter(Mandatory=$true)]
        [string]$codebase_path,
        
        [Parameter(Mandatory=$false)]
        [string]$output_dir = "./refactoring-analysis"
    )
    
    begin {
        Write-Log "Starting refactoring analysis" -Level INFO
        Write-Debug "Analyzing codebase path: $codebase_path"
        Write-Debug "Output directory: $output_dir"
        
        # Create output subdirectories for better organization
        $metrics_dir = Join-Path $output_dir "metrics"
        $patterns_dir = Join-Path $output_dir "patterns"
        $recommendations_dir = Join-Path $output_dir "recommendations"
        $cache_dir = Join-Path $output_dir "cache"
        $index_dir = Join-Path $output_dir "indices"
        
        @($output_dir, $metrics_dir, $patterns_dir, $recommendations_dir, $cache_dir, $index_dir) | ForEach-Object {
            if (-not (Test-Path $_)) {
                New-Item -ItemType Directory -Path $_ | Out-Null
                Write-Log "Created directory: $_" -Level INFO
            }
        }
        
        # Initialize concurrent collections for thread-safe operations
        $safety_scores = [ConcurrentDictionary[string,int]]::new()
        $pattern_index = [ConcurrentDictionary[string,System.Collections.Generic.HashSet[string]]]::new()
        $semantic_index = [ConcurrentDictionary[string,System.Collections.Generic.HashSet[string]]]::new()
        
        # Load or create pattern database
        $pattern_db_path = Join-Path $index_dir "pattern-database.json"
        if (Test-Path $pattern_db_path) {
            $pattern_database = Get-Content $pattern_db_path | ConvertFrom-Json
        } else {
            $pattern_database = @{
                patterns = @{}
                frequencies = @{}
                correlations = @{}
                last_update = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
        }
    }
    
    process {
        try {
            Write-Log "Analyzing codebase at: $codebase_path" -Level INFO
            
            # Get all source files
            $files = Get-ChildItem -Path $codebase_path -Recurse -File | 
                    Where-Object { $_.Extension -match "\.(js|ts|jsx|tsx|py|ps1)$" }
            
            Write-Log "Found $($files.Count) files to analyze" -Level INFO
            
            # Process files in parallel for better performance
            $files | ForEach-Object -ThrottleLimit 8 -Parallel {
                try {
                    $file = $_
                    $metrics_dir = $using:metrics_dir
                    $patterns_dir = $using:patterns_dir
                    $recommendations_dir = $using:recommendations_dir
                    $cache_dir = $using:cache_dir
                    $pattern_index = $using:pattern_index
                    $semantic_index = $using:semantic_index
                    
                    Write-Log "Processing file: $($file.Name)" -Level INFO
                    
                    $cache_key = Get-FileHash $file.FullName | Select-Object -ExpandProperty Hash
                    $cache_file = Join-Path $cache_dir "$cache_key.json"
                    
                    # Check cache first
                    if (Test-Path $cache_file) {
                        $cached_data = Get-Content $cache_file | ConvertFrom-Json
                        if ($cached_data.last_modified -eq $file.LastWriteTime.ToString("o")) {
                            Write-Debug "Using cached analysis for $($file.Name)"
                            $metrics = $cached_data.metrics
                            $patterns = $cached_data.patterns
                        } else {
                            Remove-Item $cache_file -Force
                        }
                    }
                    
                    if (-not $metrics) {
                        # Generate new analysis
                        $content = Get-Content $file.FullName -Raw
                        $metrics = Get-FileMetrics $content
                        $patterns = Get-CodePatterns -FilePath $file.FullName -Content $content -Language (Get-FileLanguage -Extension $file.Extension)
                        
                        # Analyze patterns for refactoring opportunities
                        foreach ($category in $patterns.Keys) {
                            foreach ($pattern in $patterns[$category].GetEnumerator()) {
                                $patternName = "$category.$($pattern.Key)"
                                $patternValue = $pattern.Value
                                
                                if ($patternValue.Count -gt 0) {
                                    if (-not $pattern_index.ContainsKey($patternName)) {
                                        $pattern_index[$patternName] = [ConcurrentBag[string]]::new()
                                    }
                                    $pattern_index[$patternName].Add($file.FullName)
                                }
                            }
                        }
                        
                        # Cache the results
                        @{
                            file_path = $file.FullName
                            last_modified = $file.LastWriteTime.ToString("o")
                            metrics = $metrics
                            patterns = $patterns
                        } | ConvertTo-Json -Depth 10 | Out-File $cache_file
                    }
                    
                    # Save metrics and patterns
                    $metrics_file = Join-Path $metrics_dir "$($file.Name).metrics.json"
                    $patterns_file = Join-Path $patterns_dir "$($file.Name).patterns.json"
                    $metrics | ConvertTo-Json | Out-File $metrics_file
                    $patterns | ConvertTo-Json | Out-File $patterns_file
                    
                    Write-Log "Completed analysis for: $($file.Name)" -Level INFO
                    
                    # Update pattern indices
                    foreach ($pattern in $patterns.Keys) {
                        $pattern_key = "$pattern"
                        $pattern_files = $pattern_index.GetOrAdd($pattern_key, [System.Collections.Generic.HashSet[string]]::new())
                        $pattern_files.Add($file.FullName) | Out-Null
                    }
                    
                    # Calculate and store safety score
                    $safety_score = 0
                    if ($metrics.test_coverage -gt 80) { $safety_score += 40 }
                    elseif ($metrics.test_coverage -gt 60) { $safety_score += 20 }
                    
                    if ($metrics.complexity -lt 10) { $safety_score += 30 }
                    elseif ($metrics.complexity -lt 20) { $safety_score += 15 }
                    
                    if ($metrics.change_frequency -lt 0.1) { $safety_score += 30 }
                    elseif ($metrics.change_frequency -lt 0.3) { $safety_score += 15 }
                    
                    $safety_scores = $using:safety_scores
                    $safety_scores[$file.FullName] = $safety_score
                    
                    # Create recommendation if needed
                    if ($metrics.complexity -gt 20 -or $metrics.dependencies.Count -gt 10) {
                        # Find similar patterns in other files
                        $similar_patterns = $pattern_index.GetEnumerator() | 
                            Where-Object { $_.Value.Contains($file.FullName) } |
                            ForEach-Object {
                                $pattern_key = $_.Key
                                $similar_files = $_.Value | Where-Object { $_ -ne $file.FullName }
                                @{
                                    pattern = $pattern_key
                                    similar_files = $similar_files
                                    frequency = $similar_files.Count
                                }
                            }
                        
                        $recommendation = @{
                            file = $file.FullName
                            type = "complexity_reduction"
                            metrics_file = $metrics_file
                            patterns_file = $patterns_file
                            similar_patterns = $similar_patterns
                            estimated_impact = @{
                                complexity_reduction = [Math]::Min(($metrics.complexity - 10) / 2, 10)
                                dependency_reduction = [Math]::Min(($metrics.dependencies.Count - 5) / 2, 5)
                            }
                        }
                        
                        $recommendation | ConvertTo-Json -Depth 10 | 
                            Out-File (Join-Path $recommendations_dir "$($file.Name).recommendation.json")
                    }
                }
                catch {
                    Write-ErrorLog $_
                    Write-Log "Failed to process file: $($file.Name)" -Level ERROR
                }
            }
            
            # Update pattern database with new frequencies
            $pattern_database.patterns = $pattern_index.Keys | ForEach-Object {
                @{
                    key = $_
                    frequency = $pattern_index[$_].Count
                    files = @($pattern_index[$_])
                }
            }
            
            # Calculate pattern correlations
            $pattern_database.correlations = @{}
            foreach ($pattern1 in $pattern_index.Keys) {
                foreach ($pattern2 in $pattern_index.Keys) {
                    if ($pattern1 -ne $pattern2) {
                        $files1 = $pattern_index[$pattern1]
                        $files2 = $pattern_index[$pattern2]
                        $intersection = [System.Linq.Enumerable]::Intersect($files1, $files2).Count()
                        if ($intersection -gt 0) {
                            $correlation_key = "$pattern1|$pattern2"
                            $pattern_database.correlations[$correlation_key] = @{
                                strength = $intersection / [Math]::Min($files1.Count, $files2.Count)
                                shared_files = $intersection
                            }
                        }
                    }
                }
            }
            
            $pattern_database.last_update = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $pattern_database | ConvertTo-Json -Depth 10 | Out-File $pattern_db_path
            
            # Generate summary report
            $summary = @{
                total_files = $files.Count
                high_impact_count = (Get-ChildItem $recommendations_dir -Filter "*.recommendation.json").Count
                average_safety_score = ($safety_scores.Values | Measure-Object -Average).Average
                pattern_count = $pattern_index.Count
                semantic_categories = $semantic_index.Count
                timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
            
            $summary | ConvertTo-Json | Out-File (Join-Path $output_dir "analysis-summary.json")
            
            # Generate minimal playbook with links to detailed files
            $playbook_content = @"
# Refactoring Analysis Summary

- Total Files Analyzed: $($summary.total_files)
- High Impact Opportunities: $($summary.high_impact_count)
- Average Safety Score: $([Math]::Round($summary.average_safety_score, 2))
- Unique Code Patterns: $($summary.pattern_count)
- Semantic Categories: $($summary.semantic_categories)
- Analysis Date: $($summary.timestamp)

## Recommendations by File

$(Get-ChildItem $recommendations_dir -Filter "*.recommendation.json" | ForEach-Object {
    $recommendation = Get-Content $_.FullName | ConvertFrom-Json
    @"
### $($recommendation.file)
- Type: $($recommendation.type)
- [View Metrics]($($recommendation.metrics_file))
- [View Patterns]($($recommendation.patterns_file))
- Similar Patterns Found: $($recommendation.similar_patterns.Count)
$(if ($recommendation.similar_patterns) {
    $recommendation.similar_patterns | Sort-Object frequency -Descending | Select-Object -First 3 | ForEach-Object {
        "  - $($_.pattern) (found in $($_.frequency) files)"
    }
})
- Estimated Impact:
  - Complexity Reduction: $($recommendation.estimated_impact.complexity_reduction)
  - Dependency Reduction: $($recommendation.estimated_impact.dependency_reduction)
"@
})

## Safety Scores

$(($safety_scores.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
"- $($_.Key): $($_.Value)"
}) -join "`n")

## Pattern Correlations

Top pattern correlations that might indicate refactoring opportunities:
$($pattern_database.correlations.GetEnumerator() | 
    Sort-Object { $_.Value.strength } -Descending | 
    Select-Object -First 5 | ForEach-Object {
    $patterns = $_.Key.Split('|')
    "- $($patterns[0]) ↔ $($patterns[1]): $([Math]::Round($_.Value.strength * 100, 1))% correlation"
})
"@
            
            $playbook_content | Out-File (Join-Path $output_dir "refactoring-playbook.md")
            
            Write-Information "Analysis complete! Check $output_dir for results."
            return $summary
        }
        catch {
            Write-ErrorLog $_
            throw
        }
    }
    
    end {
        Write-Information "Refactoring analysis complete"
    }
}

# Export opportunities as module
Export-ModuleMember -Function Get-RefactoringOpportunity
}
catch {
    Write-ErrorLog $_
    Stop-ScriptLogging -ScriptName "analyze-refactoring.ps1" -Status "Failed"
    throw
}
finally {
    Stop-ScriptLogging -ScriptName "analyze-refactoring.ps1"
}
