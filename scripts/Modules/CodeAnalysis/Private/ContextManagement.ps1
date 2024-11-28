using namespace System.Collections.Generic

# Context management for large codebases
$script:ContextCache = @{
    Frontend = [Dictionary[string, object]]::new()
    Backend = [Dictionary[string, object]]::new()
    Dependencies = [Dictionary[string, object]]::new()
    Patterns = [Dictionary[string, object]]::new()
}

function New-AnalysisContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$RootPath,
        [string[]]$IncludePaths,
        [string[]]$ExcludePaths,
        [string[]]$Languages = @('typescript', 'go', 'javascript', 'python', 'powershell')
    )
    
    $context = @{
        RootPath = $RootPath
        IncludePaths = $IncludePaths
        ExcludePaths = $ExcludePaths
        Languages = $Languages
        Files = @{
            Frontend = @()
            Backend = @()
            Shared = @()
        }
        Patterns = @{
            Frontend = @{}
            Backend = @{}
            Shared = @{}
        }
        Dependencies = @{
            Direct = @()
            Indirect = @()
        }
        Metrics = @{
            Files = 0
            Lines = 0
            Patterns = 0
        }
    }
    
    return $context
}

function Update-AnalysisContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Context,
        [Parameter(Mandatory)]
        [string]$Category,
        [Parameter(Mandatory)]
        [object]$Data
    )
    
    switch ($Category) {
        'Frontend' {
            $script:ContextCache.Frontend[$Context.RootPath] = $Data
        }
        'Backend' {
            $script:ContextCache.Backend[$Context.RootPath] = $Data
        }
        'Dependencies' {
            $script:ContextCache.Dependencies[$Context.RootPath] = $Data
        }
        'Patterns' {
            $script:ContextCache.Patterns[$Context.RootPath] = $Data
        }
    }
}

function Get-CachedContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$RootPath,
        [Parameter(Mandatory)]
        [string]$Category
    )
    
    switch ($Category) {
        'Frontend' { return $script:ContextCache.Frontend[$RootPath] }
        'Backend' { return $script:ContextCache.Backend[$RootPath] }
        'Dependencies' { return $script:ContextCache.Dependencies[$RootPath] }
        'Patterns' { return $script:ContextCache.Patterns[$RootPath] }
    }
}

function Clear-AnalysisContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$RootPath,
        [string]$Category
    )
    
    if ($Category) {
        switch ($Category) {
            'Frontend' { $script:ContextCache.Frontend.Remove($RootPath) }
            'Backend' { $script:ContextCache.Backend.Remove($RootPath) }
            'Dependencies' { $script:ContextCache.Dependencies.Remove($RootPath) }
            'Patterns' { $script:ContextCache.Patterns.Remove($RootPath) }
        }
    }
    else {
        $script:ContextCache.Frontend.Remove($RootPath)
        $script:ContextCache.Backend.Remove($RootPath)
        $script:ContextCache.Dependencies.Remove($RootPath)
        $script:ContextCache.Patterns.Remove($RootPath)
    }
}

function Get-ContextSummary {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Context
    )
    
    $summary = @{
        Files = @{
            Total = $Context.Files.Frontend.Count + $Context.Files.Backend.Count + $Context.Files.Shared.Count
            Frontend = $Context.Files.Frontend.Count
            Backend = $Context.Files.Backend.Count
            Shared = $Context.Files.Shared.Count
        }
        Patterns = @{
            Total = ($Context.Patterns.Frontend.Keys + $Context.Patterns.Backend.Keys + $Context.Patterns.Shared.Keys).Count
            Frontend = $Context.Patterns.Frontend.Keys.Count
            Backend = $Context.Patterns.Backend.Keys.Count
            Shared = $Context.Patterns.Shared.Keys.Count
        }
        Dependencies = @{
            Direct = $Context.Dependencies.Direct.Count
            Indirect = $Context.Dependencies.Indirect.Count
        }
        Languages = $Context.Languages
    }
    
    return $summary
}

function Get-ContextualizedAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Context,
        [Parameter(Mandatory)]
        [string]$FilePath
    )
    
    # Determine file category
    $category = switch -Regex ($FilePath) {
        '\.tsx?$' { 'Frontend' }
        '\.go$' { 'Backend' }
        default { 'Shared' }
    }
    
    # Get cached analysis if available
    $cachedAnalysis = Get-CachedContext -RootPath $Context.RootPath -Category $category
    if ($cachedAnalysis) {
        return $cachedAnalysis
    }
    
    # Perform new analysis
    $analysis = switch ($category) {
        'Frontend' {
            Get-FrontendAnalysis -FilePath $FilePath -Context $Context
        }
        'Backend' {
            Get-ContextualizedBackendAnalysis -FilePath $FilePath -Context $Context
        }
        default {
            Get-SharedAnalysis -FilePath $FilePath -Context $Context
        }
    }
    
    # Cache the results
    Update-AnalysisContext -Context $Context -Category $category -Data $analysis
    
    return $analysis
}

Export-ModuleMember -Function @(
    'New-AnalysisContext',
    'Update-AnalysisContext',
    'Get-CachedContext',
    'Clear-AnalysisContext',
    'Get-ContextSummary',
    'Get-ContextualizedAnalysis'
)
