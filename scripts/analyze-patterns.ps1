[CmdletBinding()]
param (
    [string]$OutputDir = "$PSScriptRoot/../docs/analysis/output",
    [string[]]$FileExtensions = @('.go', '.js', '.ts', '.py', '.ps1'),
    [int]$BatchSize = 100,
    [int]$MaxParallelism = 8
)

# Import required modules
. "$PSScriptRoot/logging.ps1"

# Start logging
Start-ScriptLogging -ScriptName "analyze-patterns-v2.ps1" -UseScriptSpecificLog

try {
    Write-Log "Starting enhanced pattern analysis" -Level INFO

    # Language-specific patterns
    $languagePatterns = @{
        # Go Patterns
        '.go' = @{
            Interfaces = '^\s*type\s+\w+\s+interface\s*{'
            Goroutines = '\bgo\s+\w+'
            Channels = '\bchan\b|\<-'
            ErrorHandling = 'if\s+err\s*[!:]?=|return\s+.*,\s*err'
            StructTags = '`[^`]+`'
            Testing = '^func\s+Test\w+\s*\(t\s*\*testing\.T\)'
            DeferStatements = '\bdefer\s+'
            Contexts = 'context\.Context|WithContext|ctx\s+context\.'
            Mutexes = 'sync\.Mutex|RWMutex|Lock\(\)|Unlock\(\)'
            Embedding = '^type\s+\w+\s+struct\s*{\s*\w+\s*$'
        }
        # JavaScript/TypeScript Patterns
        '.js|.ts' = @{
            ModulePatterns = '(?:import|export)\s+(?:{[^}]*}|\*|\w+)'
            ReactHooks = 'use[A-Z]\w+'
            AsyncAwait = 'async|await'
            Promises = '\.then\(|\.catch\(|Promise\.'
            TypeAnnotations = ':\s*[A-Z]\w+(?:<.*>)?'
        }
        # Python Patterns
        '.py' = @{
            Decorators = '@\w+'
            TypeHints = ':\s*\w+(?:\[.*\])?'
            Comprehensions = '\[.*for.*in.*\]|\{.*for.*in.*\}'
            AsyncIO = 'async\s+def|await'
            ContextManagers = 'with\s+.*:'
        }
        # PowerShell Patterns
        '.ps1' = @{
            CmdletBinding = '\[CmdletBinding.*\]'
            Parameters = '\[Parameter.*\]'
            ErrorHandling = 'try|catch|finally|throw'
            PipelineInput = '\{\s*process\s*\{'
            AdvancedFunctions = 'function\s+\w+-\w+'
        }
    }

    # Common patterns across all languages
    $commonPatterns = @{
        Documentation = @{
            XMLDocs = '\/\/\/|"""|''''''|#\s*\w+:'
            InlineComments = '(?:\/\/|\#|'')\s*\w+'
            TODOs = '(?:\/\/|\#|'')\s*TODO:'
            FIXMEs = '(?:\/\/|\#|'')\s*FIXME:'
        }
        Security = @{
            HardcodedSecrets = '(?i)password|secret|key|token|credential'
            SQLInjection = '(?i)select\s+.*from|insert\s+into|update\s+.*set|delete\s+from'
            UnsafeInput = '(?i)eval\(|exec\(|system\('
        }
        Performance = @{
            NestedLoops = '(?:for|while).*(?:for|while)'
            LargeCollections = '\[\d{4,}\]|\{\d{4,}\}'
            ResourceLeaks = 'open\(|new\s+\w+\('
        }
        Testing = @{
            UnitTests = 'test|spec|should'
            Mocking = 'mock|stub|fake'
            Assertions = 'assert|expect|should'
        }
        Architecture = @{
            DependencyInjection = 'inject|provider|container'
            Factory = 'factory|create\w+|build\w+'
            Singleton = 'instance|shared|global'
        }
    }

    # Create concurrent collections for thread-safe operations
    $results = [ConcurrentDictionary[string,object]]::new()

    function Get-FileLanguage {
        param([string]$Extension)
        switch -Regex ($Extension) {
            '\.go$' { return 'go' }
            '\.(?:js|jsx)$' { return 'javascript' }
            '\.(?:ts|tsx)$' { return 'typescript' }
            '\.py$' { return 'python' }
            '\.ps1$' { return 'powershell' }
            default { return 'unknown' }
        }
    }

    function Get-CodePatterns {
        param(
            [Parameter(Mandatory)]
            [string]$FilePath,
            [Parameter(Mandatory)]
            [string]$Content,
            [Parameter(Mandatory)]
            [string]$Language
        )

        $patternResults = @{}
        
        if ($languagePatterns.ContainsKey(".$Language")) {
            foreach ($pattern in $languagePatterns[".$Language"].GetEnumerator()) {
                $patternMatches = [regex]::Matches($Content, $pattern.Value)
                if ($patternMatches.Count -gt 0) {
                    $patternResults[$pattern.Key] = @($patternMatches | ForEach-Object { $_.Value })
                }
            }
        }

        foreach ($category in $commonPatterns.Keys) {
            $categoryPatterns = $commonPatterns[$category]
            $patternResults[$category] = @{}
            foreach ($pattern in $categoryPatterns.GetEnumerator()) {
                $patternMatches = [regex]::Matches($Content, $pattern.Value)
                if ($patternMatches.Count -gt 0) {
                    $patternResults[$category][$pattern.Key] = @($patternMatches | ForEach-Object { $_.Value })
                }
            }
        }

        return $patternResults
    }

    # Process files in parallel batches
    $files = Get-ChildItem -Recurse -File | Where-Object { $FileExtensions -contains $_.Extension }
    $totalFiles = $files.Count
    Write-Log "Found $totalFiles files to analyze" -Level INFO

    for ($i = 0; $i -lt $totalFiles; $i += $BatchSize) {
        $batch = $files | Select-Object -Skip $i -First $BatchSize
        
        $batch | ForEach-Object -ThrottleLimit $MaxParallelism -Parallel {
            $filePath = $_.FullName
            try {
                $content = Get-Content $filePath -Raw
                $language = Get-FileLanguage $_.Extension
                $patterns = Get-CodePatterns -FilePath $filePath -Content $content -Language $language
                
                if ($patterns.Count -gt 0) {
                    $result = @{
                        FilePath = $filePath
                        Language = $language
                        Patterns = $patterns
                    }
                    $syncResults = $using:results
                    $null = $syncResults.TryAdd($filePath, $result)
                }
            }
            catch {
                Write-Error "Error processing $filePath : $_"
            }
        }
    }

    # Generate report
    $reportPath = Join-Path $OutputDir "pattern-analysis-report.json"
    $results.Values | ConvertTo-Json -Depth 10 | Set-Content $reportPath
    Write-Log "Analysis complete. Report saved to: $reportPath" -Level INFO
}
catch {
    Write-ErrorLog $_
    Stop-ScriptLogging -ScriptName "analyze-patterns-v2.ps1" -Status "Failed"
    throw
}
finally {
    Stop-ScriptLogging -ScriptName "analyze-patterns-v2.ps1" -Status "Completed"
}
