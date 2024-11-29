# Project-wide analyzer
function Get-ProjectAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [Parameter()]
        [string[]]$ExcludeDirs = @('node_modules', 'dist', 'build', '.git', 'coverage')
    )
    
    try {
        Write-Verbose "Starting project analysis for $Path"
        
        $analysis = @{
            summary = @{
                files = 0
                issues = 0
                patterns = 0
                documentation = 0
                tests = 0
            }
            critical = @()
            high = @()
            medium = @()
            files = @()
        }

        # Ensure path exists
        if (-not (Test-Path $Path)) {
            throw "Path not found: $Path"
        }

        # Get all relevant files
        $files = @(Get-ChildItem -Path $Path -Recurse -File -ErrorAction Stop | 
            Where-Object {
                $exclude = $false
                foreach ($dir in $ExcludeDirs) {
                    if ($_.FullName -match [regex]::Escape($dir)) {
                        $exclude = $true
                        break
                    }
                }
                -not $exclude
            })

        Write-Verbose "Found $($files.Count) files to analyze"

        foreach ($file in $files) {
            # Determine language and context
            $language = switch ($file.Extension) {
                '.ts' { 'typescript' }
                '.tsx' { 'typescript' }
                '.js' { 'javascript' }
                '.jsx' { 'javascript' }
                '.go' { 'go' }
                '.ps1' { 'powershell' }
                '.psm1' { 'powershell' }
                default { $null }
            }

            if (-not $language) { 
                Write-Verbose "Skipping unsupported file type: $($file.Name)"
                continue 
            }

            # Determine context
            $context = 'any'
            if ($language -in @('typescript', 'javascript')) {
                if ($file.FullName -match '(\\|/)src(\\|/)server(\\|/)') {
                    $context = 'backend'
                }
                elseif ($file.FullName -match '(\\|/)src(\\|/)client(\\|/)') {
                    $context = 'frontend'
                }
            }

            Write-Verbose "Analyzing $($file.Name) - $language ($context)"

            # Get file content
            $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
            if (-not $content) {
                Write-Warning "Empty file: $($file.Name)"
                continue
            }

            # Get AST analysis
            $fileAnalysis = Get-CodeAnalysis -Content $content -Path $file.FullName -Language $language -Context $context
            if (-not $fileAnalysis) {
                Write-Warning "Analysis failed for $($file.Name)"
                continue
            }

            # Update summary
            $analysis.summary.files++
            $analysis.summary.issues += @($fileAnalysis.issues).Count
            $analysis.summary.patterns += @($fileAnalysis.nodes | Where-Object { $_.type -match 'Pattern$' }).Count
            $analysis.summary.documentation += @($fileAnalysis.nodes | Where-Object { $_.type -match '^JSDoc' }).Count

            # Add issues by severity
            foreach ($issue in $fileAnalysis.issues) {
                if ($issue.impact) {
                    $issueInfo = @{
                        file = $file.Name
                        path = $file.FullName.Replace($Path, '')
                        issue = $issue
                    }
                    
                    switch ($issue.impact) {
                        'critical' { $analysis.critical += $issueInfo }
                        'high' { $analysis.high += $issueInfo }
                        'medium' { $analysis.medium += $issueInfo }
                    }
                }
            }

            # Add file analysis
            $analysis.files += @{
                path = $file.FullName.Replace($Path, '')
                language = $language
                context = $context
                summary = @{
                    issues = @($fileAnalysis.issues).Count
                    patterns = @($fileAnalysis.nodes | Where-Object { $_.type -match 'Pattern$' }).Count
                    docIssues = @($fileAnalysis.nodes | Where-Object { $_.type -match '^JSDoc' }).Count
                }
            }
        }

        # Add test coverage analysis
        $testFiles = @($files | Where-Object { $_.Name -match '\.(spec|test)\.(ts|js|go|ps1)$' })
        $analysis.summary.tests = $testFiles.Count

        Write-Verbose "Analysis complete: $($analysis.summary.files) files analyzed"
        return $analysis
    }
    catch {
        Write-Error "Failed to analyze project: $_"
        return $null
    }
}

Export-ModuleMember -Function Get-ProjectAnalysis
