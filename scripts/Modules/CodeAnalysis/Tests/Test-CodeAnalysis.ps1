using namespace System.Management.Automation.Language

# Import required modules
Import-Module "$PSScriptRoot/../CodeAnalysis.psd1" -Force
. "$PSScriptRoot/Test-Helpers.ps1"
Import-Module "$PSScriptRoot/../CodeAnalysis.psd1" -Force
. "$PSScriptRoot/Test-Helpers.ps1"

# Test Categories
$testCategories = @(
    'Standard',  # Original test cases
    'Empty',     # Empty files
    'Malformed', # Files with syntax errors
    'Mixed',     # Files with mixed language content
    'Complex',   # Files with multiple patterns
    'Large'      # Large files with repeated patterns
)

$results = @{}
$totalSw = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($category in $testCategories) {
    Write-Host "`nRunning $category tests..." -ForegroundColor Cyan
    
    # Setup test files
    $testDir = Get-TestFiles -Category $category
    
    # Create analysis context
    $context = New-AnalysisContext -RootPath $testDir -Languages @('typescript', 'go')
    
    # Initialize category results
    $results[$category] = @{
        Frontend = @{}
        Backend = @{}
        Performance = @{
            Duration = @{}
            MemoryUsage = @{}
        }
        Patterns = @{
            Frontend = @{}
            Backend = @{}
        }
    }
    
    # Test TypeScript files
    $tsFiles = Get-ChildItem $testDir -Filter "*.tsx"
    foreach ($file in $tsFiles) {
        Write-Host "Analyzing frontend file: $($file.Name)" -ForegroundColor Yellow
        
        $measureResult = Measure-CodeAnalysis -FilePath $file.FullName -Context $context
        $analysis = $measureResult.Analysis
        
        # Store performance metrics
        $results[$category].Performance.Duration[$file.Name] = $measureResult.Duration
        $results[$category].Performance.MemoryUsage[$file.Name] = $measureResult.MemoryUsed
        
        # Analyze patterns
        $results[$category].Patterns.Frontend[$file.Name] = @{
            Hooks = $analysis.Patterns.react.hooks | ForEach-Object { $_.name }
            APIPatterns = $analysis.Patterns.api.patterns | ForEach-Object { $_.type }
            SecurityPatterns = $analysis.Patterns.security | ForEach-Object { $_.type }
            PerformancePatterns = $analysis.Patterns.performance | ForEach-Object { $_.type }
            StateManagement = $analysis.Patterns.state | ForEach-Object { $_.type }
        }
    }
    
    # Test Go files
    $goFiles = Get-ChildItem $testDir -Filter "*.go"
    foreach ($file in $goFiles) {
        Write-Host "Analyzing backend file: $($file.Name)" -ForegroundColor Yellow
        
        $measureResult = Measure-CodeAnalysis -FilePath $file.FullName -Context $context
        $analysis = $measureResult.Analysis
        
        # Store performance metrics
        $results[$category].Performance.Duration[$file.Name] = $measureResult.Duration
        $results[$category].Performance.MemoryUsage[$file.Name] = $measureResult.MemoryUsed
        
        # Analyze patterns
        $results[$category].Patterns.Backend[$file.Name] = @{
            Database = $analysis.Patterns.Database | ForEach-Object { $_.Name }
            API = $analysis.Patterns.API | ForEach-Object { $_.Name }
            Security = $analysis.Patterns.Security | ForEach-Object { $_.Name }
            Performance = $analysis.Patterns.Performance | ForEach-Object { $_.Name }
            Monitoring = $analysis.Patterns.Monitoring | ForEach-Object { $_.Name }
        }
    }
}

$totalSw.Stop()

# Generate comprehensive test report
$report = New-TestReport -TestName "CodeAnalysis-$(Get-Date -Format 'yyyyMMdd')" `
                        -Results $results `
                        -Duration $totalSw.Elapsed

Write-Host "`nTest Summary:" -ForegroundColor Cyan
Write-Host "Total Duration: $($totalSw.Elapsed.TotalSeconds) seconds" -ForegroundColor Yellow
Write-Host "Report saved to: $($report.ReportPath)" -ForegroundColor Yellow

# Cleanup
Get-ChildItem "$PSScriptRoot/TestFiles" -Recurse | Remove-Item -Force
Remove-Item "$PSScriptRoot/TestFiles" -Force
