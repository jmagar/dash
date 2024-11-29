# Import module for testing
$ModuleRoot = Split-Path -Parent $PSScriptRoot
$ModuleName = "CodeAnalysis"
$ModuleManifestPath = Join-Path $ModuleRoot "$ModuleName.psd1"

# Import Pester if not already imported
if (-not (Get-Module -Name Pester -ErrorAction SilentlyContinue)) {
    Import-Module Pester -ErrorAction Stop
}

# Remove module if already loaded
Remove-Module $ModuleName -ErrorAction SilentlyContinue

# Import the module
Import-Module $ModuleManifestPath -Force -ErrorAction Stop

Describe "CodeAnalysis Module Tests" {
    BeforeEach {
        # Create test data directory with absolute path
        $script:TestDataPath = Join-Path $PSScriptRoot "TestData"
        if (-not (Test-Path $script:TestDataPath)) {
            New-Item -Path $script:TestDataPath -ItemType Directory -Force | Out-Null
        }
    }
    
    AfterEach {
        # Clean up test data
        if (Test-Path $script:TestDataPath) {
            Remove-Item -Path $script:TestDataPath -Recurse -Force
        }
    }
    
    Context "Individual Analysis Functions" {
        BeforeEach {
            # Create test file with known issues
            $script:TestCode = @'
function Test-Performance {
    $items = 1..200
    $testResults = @()
    foreach ($item in $items) {
        $testResults += $item # Array concatenation in loop
    }
    Invoke-Expression "$testResults" # Security issue
    return $testResults
}
'@
        }

        It "Should detect security issues" {
            # Act
            $result = Get-SecurityIssues -Content $script:TestCode

            # Assert
            $result | Should Not Be $null
            $result.score | Should Be 80
            $result.issues.Count | Should Be 1
            $result.issues[0].name | Should Be "Use of Invoke-Expression"
        }
        
        It "Should detect performance issues" {
            # Act
            $result = Get-PerformanceMetrics -Content $script:TestCode

            # Assert
            $result | Should Not Be $null
            $result.score | Should Be 90
            $result.metrics.Count | Should Be 1
            $result.metrics[0].name | Should Be "Array concatenation"
        }
        
        It "Should detect code patterns" {
            # Act
            $result = Get-CodePatterns -Content $script:TestCode

            # Assert
            $result | Should Not Be $null
            $result.patterns.Count | Should Be 2
            $result.matched.Count | Should Be 2
            $result.matched.name -contains "Array concatenation" | Should Be $true
            $result.matched.name -contains "Invoke-Expression" | Should Be $true
        }
    }
    
    Context "Full Code Analysis" {
        BeforeEach {
            # Create test data directory
            $script:TestDataPath = Join-Path $PSScriptRoot "TestData"
            if (-not (Test-Path $script:TestDataPath)) {
                New-Item -Path $script:TestDataPath -ItemType Directory -Force | Out-Null
            }

            # Create test file with known issues
            Set-Content -Path (Join-Path $script:TestDataPath "test.ps1") -Value $script:TestCode
        }

        AfterEach {
            # Clean up test data
            if (Test-Path $script:TestDataPath) {
                Remove-Item -Path $script:TestDataPath -Recurse -Force
            }
        }

        It "Should analyze code and calculate correct scores" {
            # Act
            $result = Invoke-CodeAnalysis -Path (Join-Path $script:TestDataPath "test.ps1")

            # Assert
            $result | Should Not Be $null
            $result.files.Count | Should Be 1
            $result.summary.processedFiles | Should Be 1
            
            # Check security score
            $result.files[0].security.score | Should Be 80
            $result.files[0].security.issues.Count | Should Be 1
            
            # Check performance score
            $result.files[0].performance.score | Should Be 90
            $result.files[0].performance.metrics.Count | Should Be 1
            
            # Check average score
            $result.summary.averageScore | Should Be 85
        }

        It "Should handle empty files correctly" {
            # Arrange
            Set-Content -Path (Join-Path $script:TestDataPath "empty.ps1") -Value ""

            # Act
            $result = Invoke-CodeAnalysis -Path (Join-Path $script:TestDataPath "empty.ps1")

            # Assert
            $result | Should Not Be $null
            $result.files.Count | Should Be 1
            $result.summary.processedFiles | Should Be 1
            $result.summary.averageScore | Should Be 100
            $result.files[0].security.score | Should Be 100
            $result.files[0].performance.score | Should Be 100
        }
    }
}
