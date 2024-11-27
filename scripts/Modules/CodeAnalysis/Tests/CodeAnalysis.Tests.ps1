BeforeAll {
    # Import module
    $modulePath = (Get-Item $PSScriptRoot).Parent.FullName
    Import-Module $modulePath -Force
    
    # Create test data
    $script:TestDataPath = Join-Path $PSScriptRoot "TestData"
    if (-not (Test-Path $script:TestDataPath)) {
        New-Item -ItemType Directory -Path $script:TestDataPath -Force
    }
    
    # Create test files
    @"
function test() {
    if (true) {
        console.log('test');
    }
}
"@ | Out-File (Join-Path $script:TestDataPath "test.js")

    @"
def test():
    if True:
        print('test')
"@ | Out-Path (Join-Path $script:TestDataPath "test.py")
}

Describe "CodeAnalysis Module" {
    Context "Module Loading" {
        It "Should import successfully" {
            Get-Module CodeAnalysis | Should -Not -BeNullOrEmpty
        }
        
        It "Should export required functions" {
            @('Invoke-CodeAnalysis', 'Export-CodeVisualization') | ForEach-Object {
                Get-Command -Module CodeAnalysis -Name $_ | Should -Not -BeNullOrEmpty
            }
        }
    }
    
    Context "Invoke-CodeAnalysis" {
        It "Should analyze valid paths" {
            $outputPath = Join-Path $TestDrive "analysis"
            $result = Invoke-CodeAnalysis -Path $script:TestDataPath -OutputPath $outputPath
            $result | Should -Not -BeNullOrEmpty
            $result.totalFiles | Should -BeGreaterThan 0
        }
        
        It "Should handle invalid paths gracefully" {
            { Invoke-CodeAnalysis -Path "./NonExistent" } | 
                Should -Throw -ExpectedMessage "*Path not found*"
        }
        
        It "Should respect file extensions filter" {
            $outputPath = Join-Path $TestDrive "analysis-js"
            $result = Invoke-CodeAnalysis -Path $script:TestDataPath -OutputPath $outputPath -FileExtensions @('.js')
            $result.languages.Keys | Should -Contain 'javascript'
            $result.languages.Keys | Should -Not -Contain 'python'
        }
        
        It "Should generate required output files" {
            $outputPath = Join-Path $TestDrive "analysis-full"
            $null = Invoke-CodeAnalysis -Path $script:TestDataPath -OutputPath $outputPath
            
            @(
                'summary.json',
                'details.json',
                'report.md'
            ) | ForEach-Object {
                Test-Path (Join-Path $outputPath $_) | Should -BeTrue
            }
        }
        
        It "Should detect security issues" {
            @"
const password = 'hardcoded';
eval('console.log("test")');
"@ | Out-File (Join-Path $script:TestDataPath "security.js")
            
            $outputPath = Join-Path $TestDrive "analysis-security"
            $result = Invoke-CodeAnalysis -Path $script:TestDataPath -OutputPath $outputPath
            $result.security.highRiskFiles.Count | Should -BeGreaterThan 0
        }
    }
    
    Context "Export-CodeVisualization" {
        BeforeAll {
            $script:AnalysisPath = Join-Path $TestDrive "viz-analysis"
            $null = Invoke-CodeAnalysis -Path $script:TestDataPath -OutputPath $script:AnalysisPath
        }
        
        It "Should generate Mermaid diagram" {
            $outputPath = Join-Path $TestDrive "viz-mermaid"
            Export-CodeVisualization -AnalysisPath $script:AnalysisPath -OutputPath $outputPath -Format 'mermaid'
            Test-Path (Join-Path $outputPath "dependencies.mmd") | Should -BeTrue
        }
        
        It "Should generate D3 visualization" {
            $outputPath = Join-Path $TestDrive "viz-d3"
            Export-CodeVisualization -AnalysisPath $script:AnalysisPath -OutputPath $outputPath -Format 'd3'
            Test-Path (Join-Path $outputPath "visualization.html") | Should -BeTrue
        }
        
        It "Should handle missing analysis data gracefully" {
            { Export-CodeVisualization -AnalysisPath "./NonExistent" -OutputPath $TestDrive } |
                Should -Throw -ExpectedMessage "*Analysis data not found*"
        }
    }
}

AfterAll {
    # Cleanup test data
    if (Test-Path $script:TestDataPath) {
        Remove-Item $script:TestDataPath -Recurse -Force
    }
}
