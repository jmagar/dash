# Set strict mode for better error detection
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Get the module path
$modulePath = $PSScriptRoot

# Import all private functions first
$privateFunctions = @(Get-ChildItem -Path "$modulePath\Private\*.ps1" -ErrorAction SilentlyContinue)
foreach ($function in $privateFunctions) {
    try {
        . $function.FullName
        Write-Verbose "Imported private function: $($function.BaseName)"
    }
    catch {
        Write-Error "Failed to import private function $($function.FullName): $_"
        throw
    }
}

# Initialize function
function Initialize-CodeAnalysis {
    [CmdletBinding()]
    param(
        [Parameter()]
        [hashtable]$Configuration = @{}
    )
    
    try {
        $result = Initialize-ModuleState -Configuration $Configuration
        if (-not $result.success) {
            throw $result.error
        }
        
        return @{
            success = $true
            message = "Code analysis module initialized successfully"
        }
    }
    catch {
        Write-Error "Failed to initialize code analysis module: $_"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

# Main analysis function
function Invoke-CodeAnalysis {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$Path = ".",
        [Parameter()]
        [string[]]$ExcludeDirs = @('node_modules', 'dist', 'build', '.git', 'coverage'),
        [Parameter()]
        [ValidateSet('Json', 'Summary', 'Detailed')]
        [string]$OutputFormat = 'Summary'
    )
    
    try {
        # Initialize if not already initialized
        $state = Get-ModuleState
        if (-not $state -or -not $state.initialized) {
            $initResult = Initialize-CodeAnalysis
            if (-not $initResult.success) {
                throw $initResult.error
            }
        }
        
        Write-Verbose "Starting analysis of $Path"
        
        # Get project analysis
        $analysis = Get-ProjectAnalysis -Path $Path -ExcludeDirs $ExcludeDirs
        if (-not $analysis) {
            throw "Project analysis failed"
        }
        
        # Format output
        switch ($OutputFormat) {
            'Json' {
                return $analysis | ConvertTo-Json -Depth 10
            }
            'Summary' {
                # Create summary output
                $summary = @"
Code Analysis Summary
===================

Files Analyzed: $($analysis.summary.files)
Total Issues: $($analysis.summary.issues)
Pattern Matches: $($analysis.summary.patterns)
Documentation Issues: $($analysis.summary.documentation)
Test Files: $($analysis.summary.tests)

Critical Issues: $($analysis.critical.Count)
High Priority: $($analysis.high.Count)
Medium Priority: $($analysis.medium.Count)

Critical Issues
--------------
$($analysis.critical | ForEach-Object {
    "`n[$($_.file)]`n$($_.issue.message)`nImpact: $($_.issue.impact)`nCategory: $($_.issue.category)`n"
})

High Priority Issues
------------------
$($analysis.high | ForEach-Object {
    "`n[$($_.file)]`n$($_.issue.message)`nImpact: $($_.issue.impact)`nCategory: $($_.issue.category)`n"
})

Files by Type
------------
$($analysis.files | Group-Object language | ForEach-Object {
    "$($_.Name): $($_.Count) files"
})

"@
                return $summary
            }
            'Detailed' {
                # Create detailed output
                $detailed = @"
Detailed Code Analysis Report
==========================

Project Overview
---------------
Files Analyzed: $($analysis.summary.files)
Total Issues: $($analysis.summary.issues)
Pattern Matches: $($analysis.summary.patterns)
Documentation Issues: $($analysis.summary.documentation)
Test Files: $($analysis.summary.tests)

Critical Issues ($($analysis.critical.Count))
----------------------------------------
$($analysis.critical | ForEach-Object {
@"

File: $($_.file)
Path: $($_.path)
Issue: $($_.issue.message)
Impact: $($_.issue.impact)
Category: $($_.issue.category)
Suggestion: $($_.issue.suggestion)

"@
})

High Priority Issues ($($analysis.high.Count))
----------------------------------------
$($analysis.high | ForEach-Object {
@"

File: $($_.file)
Path: $($_.path)
Issue: $($_.issue.message)
Impact: $($_.issue.impact)
Category: $($_.issue.category)
Suggestion: $($_.issue.suggestion)

"@
})

File Analysis
------------
$($analysis.files | ForEach-Object {
@"

[$($_.path)]
Language: $($_.language)
Context: $($_.context)
Issues: $($_.summary.issues)
Patterns: $($_.summary.patterns)
Documentation: $($_.summary.docIssues)

"@
})

"@
                return $detailed
            }
        }
    }
    catch {
        Write-Error "Failed to analyze project: $_"
        return $null
    }
}

# Export public functions
Export-ModuleMember -Function @(
    'Initialize-CodeAnalysis',
    'Invoke-CodeAnalysis'
)
