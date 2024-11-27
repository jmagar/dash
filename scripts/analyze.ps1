# PowerShell script for code analysis
using namespace System.Collections.Concurrent

# Import logging module
. "$PSScriptRoot/logging.ps1"

# Import pattern analysis module
. "$PSScriptRoot/analyze-patterns.ps1"

# Set strict mode and preferences
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = 'Continue'

# Start logging
Start-ScriptLogging -ScriptName "analyze.ps1" -UseScriptSpecificLog

try {
    # Configuration
    $analysisRoot = "../docs/analysis"
    $outputDir = "$analysisRoot/results"
    $cacheDir = "$analysisRoot/cache"
    $configFile = "./analysis-config.json"
    
    # Create directories if they don't exist
    $directories = @($analysisRoot, $outputDir, $cacheDir)
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            Write-Log "Creating directory: $dir" -Level INFO
            New-Item -ItemType Directory -Path $dir | Out-Null
        }
    }

    function Get-FileMetrics {
        param(
            [string]$content,
            [string]$filePath
        )
        
        try {
            # Get patterns from the new pattern analysis
            $patterns = Get-CodePatterns -FilePath $filePath -Content $content -Language (Get-FileLanguage -Extension ([System.IO.Path]::GetExtension($filePath)))
            
            $metrics = @{
                lines = ($content -split "`n").Count
                complexity = 0
                dependencies = @()
                patterns = $patterns
                test_coverage = 0
                change_frequency = 0
            }
            
            # Calculate cyclomatic complexity
            $controlFlow = @(
                'if\s*\(',
                'else\s*{',
                'while\s*\(',
                'for\s*\(',
                'foreach\s*\(',
                'catch\s*{',
                '\?\s*.',
                '\|\|',
                '&&'
            )
            
            foreach ($pattern in $controlFlow) {
                $patternMatches = [regex]::Matches($content, $pattern)
                $metrics.complexity += $patternMatches.Count
            }
            
            # Find dependencies
            $importPatterns = @(
                'import\s+.*\s+from\s+[''"]([^''"]+)[''"]',
                'require\s*\([''"]([^''"]+)[''"]\)',
                'using\s+(\w+)',
                'import\s+(\w+)'
            )
            
            foreach ($pattern in $importPatterns) {
                $patternMatches = [regex]::Matches($content, $pattern)
                foreach ($match in $patternMatches) {
                    $metrics.dependencies += $match.Groups[1].Value
                }
            }
            
            Write-Log "Calculated metrics for file: Lines=$($metrics.lines), Complexity=$($metrics.complexity)" -Level INFO
            return $metrics
        }
        catch {
            Write-ErrorLog $_
            throw
        }
    }

    function Get-CodePatterns {
        param(
            [string]$content,
            [hashtable]$config
        )
        
        try {
            $patterns = @{}
            foreach ($category in $config.code_patterns.PSObject.Properties) {
                $categoryName = $category.Name
                $patterns[$categoryName] = @{}
                
                foreach ($pattern in $category.Value.PSObject.Properties) {
                    $patternName = $pattern.Name
                    $patternData = $pattern.Value
                    
                    $patternMatches = [regex]::Matches($content, $patternData.indicators)
                    $foundMatches = @()
                    
                    foreach ($match in $patternMatches) {
                        $foundMatches += @{
                            line = ($content.Substring(0, $match.Index).Split("`n")).Count
                            text = $match.Value
                            index = $match.Index
                        }
                    }
                    
                    if ($foundMatches.Count -gt 0) {
                        $patterns[$categoryName][$patternName] = @{
                            count = $foundMatches.Count
                            matches = $foundMatches
                            effectiveness = if ($patternData.PSObject.Properties.Match('effectiveness').Count) {
                                $patternData.effectiveness
                            } else {
                                @{
                                    maintainability = 0
                                    reliability = 0
                                    security = 0
                                }
                            }
                        }
                    }
                }
            }
            
            Write-Log "Calculated code patterns for file" -Level INFO
            return $patterns
        }
        catch {
            Write-ErrorLog $_
            throw
        }
    }

    function Get-GitMetrics {
        param(
            [string]$filePath
        )
        
        try {
            $metrics = @{
                commits = 0
                authors = @()
                last_modified = $null
                commit_frequency = 0
            }
            
            $commitInfo = @{
                author = git log -1 --format="%an" $filePath
                date = git log -1 --format="%ad" --date=iso $filePath
                message = git log -1 --format="%s" $filePath
            }
            
            $metrics.commits = (git rev-list --count HEAD $filePath)
            $metrics.authors = @(git log --format="%an" $filePath | Sort-Object -Unique)
            $metrics.last_modified = [datetime]::Parse($commitInfo.date)
            
            # Calculate commit frequency (commits per day)
            $firstCommitDate = [datetime]::Parse((git log --reverse --format="%ad" --date=iso $filePath | Select-Object -First 1))
            $daysSinceFirstCommit = ([datetime]::Now - $firstCommitDate).Days
            if ($daysSinceFirstCommit -gt 0) {
                $metrics.commit_frequency = $metrics.commits / $daysSinceFirstCommit
            }
            
            Write-Log "Calculated git metrics for file: Commits=$($metrics.commits), Authors=$($metrics.authors.Count)" -Level INFO
            return $metrics
        }
        catch {
            Write-ErrorLog $_
            throw
        }
    }

    function Get-TestCoverage {
        param(
            [string]$filePath
        )
        
        try {
            # Mock coverage data - replace with actual coverage collection
            $coverage = @{
                lines = 0
                branches = 0
                functions = 0
            }
            
            # TODO: Implement actual coverage collection
            # This could involve:
            # 1. Running tests with coverage instrumentation
            # 2. Parsing coverage reports
            # 3. Calculating file-specific metrics
            
            Write-Log "Calculated test coverage for file: Lines=$($coverage.lines), Branches=$($coverage.branches), Functions=$($coverage.functions)" -Level INFO
            return $coverage
        }
        catch {
            Write-ErrorLog $_
            throw
        }
    }

    function Export-AnalysisData {
        param(
            [string]$outputPath,
            [object]$data
        )
        
        try {
            $data | ConvertTo-Json -Depth 10 | Out-File $outputPath
            Write-Log "Analysis data exported to $outputPath" -Level INFO
        }
        catch {
            Write-ErrorLog $_
            throw
        }
    }

    # Main execution
    try {
        Write-Log "Starting code analysis..." -Level INFO
        
        # Load configuration
        $config = Get-Content $configFile | ConvertFrom-Json
        
        # Initialize analysis data structure
        $analysisData = @{
            timestamp = Get-Date -Format "o"
            files = @{
                index = @()
                metrics = @{
                    complexity = @{}
                    coverage = @{}
                    changes = @{}
                }
            }
            patterns = @{
                index = @()
                categories = @{}
                usage = @{
                    frequency = @{}
                    effectiveness = @{}
                    components = @{}
                }
            }
            components = @{
                index = @()
                relationships = @{
                    dependencies = @{}
                    patterns = @{}
                }
            }
            summary = @{
                total_files = 0
                total_patterns = 0
                quick_wins = @()
                high_impact = @()
                risks = @()
            }
        }
        
        Write-Log "Analysis complete!" -Level INFO
        return $analysisData
    }
    catch {
        Write-ErrorLog $_
        throw
    }
    finally {
        Stop-ScriptLogging -ScriptName "analyze.ps1"
    }
}
catch {
    Write-ErrorLog $_
    Stop-ScriptLogging -ScriptName "analyze.ps1" -Status "Failed"
    throw
}
