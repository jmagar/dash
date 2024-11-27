using namespace System.Collections.Concurrent

# Import required modules
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

# Initialize concurrent dictionaries for thread-safe access
$script:AstCache = [ConcurrentDictionary[string,object]]::new()
$script:SymbolIndex = [ConcurrentDictionary[string,object]]::new()
$script:DependencyGraph = [ConcurrentDictionary[string,object]]::new()

function Initialize-CodeIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$RootPath
    )

    try {
        # Create index directories if they don't exist
        $indexPath = $script:Config.ast.indexPath
        if (-not (Test-Path $indexPath)) {
            New-Item -Path $indexPath -ItemType Directory -Force | Out-Null
        }

        # Initialize Lucene.NET index
        Add-Type -Path "$PSScriptRoot/../lib/Lucene.Net.dll"
        $analyzer = [Lucene.Net.Analysis.Standard.StandardAnalyzer]::new()
        $indexDir = [Lucene.Net.Store.FSDirectory]::Open($indexPath)
        $writer = [Lucene.Net.Index.IndexWriter]::new($indexDir, $analyzer, $true)

        # Store index writer for later use
        $script:IndexWriter = $writer

        Write-Verbose "Initialized code index at $indexPath"
        return $true
    }
    catch {
        Write-Error "Failed to initialize code index: $_"
        return $false
    }
}

function Add-FileToIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$Language,
        [Parameter(Mandatory)]
        [hashtable]$Metrics
    )

    try {
        # Create Lucene document
        $doc = [Lucene.Net.Documents.Document]::new()
        
        # Add fields
        $doc.Add([Lucene.Net.Documents.Field]::new(
            "path",
            $FilePath,
            [Lucene.Net.Documents.Field+Store]::YES,
            [Lucene.Net.Documents.Field+Index]::NOT_ANALYZED
        ))
        
        $doc.Add([Lucene.Net.Documents.Field]::new(
            "language",
            $Language,
            [Lucene.Net.Documents.Field+Store]::YES,
            [Lucene.Net.Documents.Field+Index]::NOT_ANALYZED
        ))
        
        # Add metrics
        foreach ($metric in $Metrics.GetEnumerator()) {
            $doc.Add([Lucene.Net.Documents.Field]::new(
                $metric.Key,
                $metric.Value.ToString(),
                [Lucene.Net.Documents.Field+Store]::YES,
                [Lucene.Net.Documents.Field+Index]::NOT_ANALYZED
            ))
        }
        
        # Add symbols from metrics
        foreach ($symbol in $Metrics.symbols) {
            $symbolField = "$($symbol.type)_$($symbol.name)"
            $doc.Add([Lucene.Net.Documents.Field]::new(
                $symbolField,
                "$($symbol.start):$($symbol.end)",
                [Lucene.Net.Documents.Field+Store]::YES,
                [Lucene.Net.Documents.Field+Index]::NOT_ANALYZED
            ))
            
            # Update symbol index
            $script:SymbolIndex[$symbolField] = @{
                file = $FilePath
                type = $symbol.type
                name = $symbol.name
                start = $symbol.start
                end = $symbol.end
            }
        }
        
        # Add dependencies from metrics
        foreach ($dep in $Metrics.dependencies) {
            $doc.Add([Lucene.Net.Documents.Field]::new(
                "dependency",
                $dep,
                [Lucene.Net.Documents.Field+Store]::YES,
                [Lucene.Net.Documents.Field+Index]::NOT_ANALYZED
            ))
            
            # Update dependency graph
            if (-not $script:DependencyGraph[$FilePath]) {
                $script:DependencyGraph[$FilePath] = @()
            }
            $script:DependencyGraph[$FilePath] += $dep
        }
        
        # Add document to index
        $script:IndexWriter.AddDocument($doc)
        
        return $true
    }
    catch {
        Write-Error "Failed to add file to index: $_"
        return $false
    }
}

function Search-CodeIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Query,
        [string]$Language,
        [string]$SymbolType,
        [int]$MaxResults = 100
    )

    try {
        # Create searcher
        $searcher = [Lucene.Net.Search.IndexSearcher]::new($script:IndexWriter.GetReader())
        $analyzer = [Lucene.Net.Analysis.Standard.StandardAnalyzer]::new()
        
        # Build query
        $queryBuilder = [Lucene.Net.Search.BooleanQuery]::new()
        
        # Add main query
        $parser = [Lucene.Net.QueryParsers.QueryParser]::new("content", $analyzer)
        $mainQuery = $parser.Parse($Query)
        $queryBuilder.Add($mainQuery, [Lucene.Net.Search.BooleanClause+Occur]::MUST)
        
        # Add language filter if specified
        if ($Language) {
            $langQuery = [Lucene.Net.Search.TermQuery]::new(
                [Lucene.Net.Index.Term]::new("language", $Language)
            )
            $queryBuilder.Add($langQuery, [Lucene.Net.Search.BooleanClause+Occur]::MUST)
        }
        
        # Add symbol type filter if specified
        if ($SymbolType) {
            $typeQuery = [Lucene.Net.Search.WildcardQuery]::new(
                [Lucene.Net.Index.Term]::new("${SymbolType}_*", "*")
            )
            $queryBuilder.Add($typeQuery, [Lucene.Net.Search.BooleanClause+Occur]::MUST)
        }
        
        # Execute search
        $hits = $searcher.Search($queryBuilder, $null, $MaxResults)
        
        # Format results
        $results = @()
        foreach ($hit in $hits.ScoreDocs) {
            $doc = $searcher.Doc($hit.Doc)
            $results += @{
                path = $doc.Get("path")
                language = $doc.Get("language")
                score = $hit.Score
                symbols = Get-DocumentSymbols $doc
                dependencies = Get-DocumentDependencies $doc
                complexity = [int]$doc.Get("complexity")
            }
        }
        
        return $results
    }
    catch {
        Write-Error "Failed to search code index: $_"
        return @()
    }
}

function Get-DocumentSymbols {
    param([Lucene.Net.Documents.Document]$Doc)
    
    $symbols = @()
    foreach ($field in $Doc.Fields()) {
        if ($field.Name -match '^(function|class|variable)_') {
            $type, $name = $field.Name -split '_'
            $start, $end = $field.StringValue -split ':'
            $symbols += @{
                type = $type
                name = $name
                start = [int]$start
                end = [int]$end
            }
        }
    }
    return $symbols
}

function Get-DocumentDependencies {
    param([Lucene.Net.Documents.Document]$Doc)
    
    $deps = @()
    foreach ($field in $Doc.Fields()) {
        if ($field.Name -eq 'dependency') {
            $deps += $field.StringValue
        }
    }
    return $deps
}

function Update-CodeIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath
    )

    try {
        # Remove existing document
        $term = [Lucene.Net.Index.Term]::new("path", $FilePath)
        $script:IndexWriter.DeleteDocuments($term)
        
        # Remove from caches
        $script:AstCache.TryRemove($FilePath, [ref]$null)
        $script:DependencyGraph.TryRemove($FilePath, [ref]$null)
        
        # Read and add updated content
        $content = Get-Content $FilePath -Raw
        $language = Get-FileLanguage -Extension ([System.IO.Path]::GetExtension($FilePath))
        
        return (Add-FileToIndex -FilePath $FilePath -Content $content -Language $language -Metrics (Get-AstMetrics -Ast (Get-AstParser -Language $language -Content $content).ast -Language $language))
    }
    catch {
        Write-Error "Failed to update index for $FilePath : $_"
        return $false
    }
}

function Close-CodeIndex {
    [CmdletBinding()]
    param()
    
    try {
        if ($script:IndexWriter) {
            $script:IndexWriter.Optimize()
            $script:IndexWriter.Dispose()
        }
        return $true
    }
    catch {
        Write-Error "Failed to close code index: $_"
        return $false
    }
}

# Export functions
Export-ModuleMember -Function Initialize-CodeIndex, Add-FileToIndex, Search-CodeIndex, 
                              Update-CodeIndex, Close-CodeIndex
