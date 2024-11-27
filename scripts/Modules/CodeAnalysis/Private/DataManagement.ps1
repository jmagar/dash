# Data management and indexing system
using namespace System.Collections.Concurrent

# Configuration
$script:DataConfig = @{
    IndexPath = Join-Path $PSScriptRoot "../Data/Index"
    AnalysisPath = Join-Path $PSScriptRoot "../Data/Analysis"
    SearchPath = Join-Path $PSScriptRoot "../Data/Search"
    MaxIndexSize = 1GB
    ChunkSize = 10MB
}

# Initialize SQLite for fast searching
function Initialize-SearchDatabase {
    [CmdletBinding()]
    param(
        [switch]$Force
    )
    
    try {
        # Check if database already exists and is valid
        $dbPath = Join-Path $script:DataConfig.SearchPath "analysis.db"
        if (-not $Force -and (Test-Path $dbPath)) {
            try {
                # Test the database with a simple query
                $null = Invoke-SqliteQuery -DataSource $dbPath -Query "SELECT 1;"
                return # Database exists and is valid
            }
            catch {
                Write-Verbose "Existing database appears corrupted, recreating..."
            }
        }

        # Create SQLite database for indexing
        $null = New-Item -Path $script:DataConfig.SearchPath -ItemType Directory -Force
        
        $query = @"
CREATE TABLE IF NOT EXISTS analysis_index (
    id TEXT PRIMARY KEY,
    file_path TEXT,
    language TEXT,
    analysis_type TEXT,
    timestamp DATETIME,
    data_path TEXT,
    metadata TEXT
);

CREATE TABLE IF NOT EXISTS pattern_index (
    id TEXT,
    pattern_name TEXT,
    pattern_type TEXT,
    line_number INTEGER,
    context TEXT,
    FOREIGN KEY(id) REFERENCES analysis_index(id)
);

CREATE TABLE IF NOT EXISTS metrics_index (
    id TEXT,
    metric_name TEXT,
    metric_value REAL,
    FOREIGN KEY(id) REFERENCES analysis_index(id)
);

CREATE INDEX IF NOT EXISTS idx_file_path ON analysis_index(file_path);
CREATE INDEX IF NOT EXISTS idx_pattern_name ON pattern_index(pattern_name);
"@
        Invoke-SqliteQuery -DataSource $dbPath -Query $query
        Write-Verbose "Search database initialized successfully"
    }
    catch {
        Write-Error "Failed to initialize search database: $_"
        throw
    }
}

# Helper function to ensure database is initialized
function Assert-DatabaseInitialized {
    [CmdletBinding()]
    param()
    
    try {
        $dbPath = Join-Path $script:DataConfig.SearchPath "analysis.db"
        if (-not (Test-Path $dbPath)) {
            Initialize-SearchDatabase
        }
        else {
            try {
                $null = Invoke-SqliteQuery -DataSource $dbPath -Query "SELECT 1;"
            }
            catch {
                Initialize-SearchDatabase -Force
            }
        }
    }
    catch {
        Write-Error "Failed to ensure database is initialized: $_"
        throw
    }
}

function Add-AnalysisData {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        
        [Parameter(Mandatory)]
        [object]$AnalysisData,
        
        [Parameter(Mandatory)]
        [string]$AnalysisType
    )
    
    try {
        Assert-DatabaseInitialized
        $id = [Guid]::NewGuid().ToString()
        $timestamp = [DateTime]::UtcNow
        
        # Store raw data in chunks
        $dataPath = Join-Path $script:DataConfig.AnalysisPath "$id.json"
        $null = New-Item -Path (Split-Path $dataPath -Parent) -ItemType Directory -Force
        
        # Compress and store data
        $jsonData = $AnalysisData | ConvertTo-Json -Depth 100 -Compress
        [System.IO.File]::WriteAllText($dataPath, $jsonData)
        
        # Index in SQLite
        $dbPath = Join-Path $script:DataConfig.SearchPath "analysis.db"
        
        # Add to analysis index
        $query = @"
INSERT INTO analysis_index (id, file_path, language, analysis_type, timestamp, data_path, metadata)
VALUES (@id, @filePath, @language, @analysisType, @timestamp, @dataPath, @metadata);
"@
        
        $params = @{
            id = $id
            filePath = $FilePath
            language = $AnalysisData.language
            analysisType = $AnalysisType
            timestamp = $timestamp.ToString('o')
            dataPath = $dataPath
            metadata = ($AnalysisData.summary | ConvertTo-Json -Compress)
        }
        
        Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters $params
        
        # Index patterns
        if ($AnalysisData.patterns) {
            foreach ($pattern in $AnalysisData.patterns.GetEnumerator()) {
                $query = @"
INSERT INTO pattern_index (id, pattern_name, pattern_type, line_number, context)
VALUES (@id, @patternName, @patternType, @lineNumber, @context);
"@
                
                foreach ($occurrence in $pattern.Value) {
                    $params = @{
                        id = $id
                        patternName = $pattern.Key
                        patternType = $occurrence.type
                        lineNumber = $occurrence.line
                        context = $occurrence.value
                    }
                    
                    Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters $params
                }
            }
        }
        
        # Index metrics
        if ($AnalysisData.metrics) {
            foreach ($metric in $AnalysisData.metrics.GetEnumerator()) {
                $query = @"
INSERT INTO metrics_index (id, metric_name, metric_value)
VALUES (@id, @metricName, @metricValue);
"@
                
                $params = @{
                    id = $id
                    metricName = $metric.Key
                    metricValue = $metric.Value
                }
                
                Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters $params
            }
        }
        
        return $id
    }
    catch {
        Write-Error "Failed to add analysis data: $_"
        throw
    }
}

function Search-AnalysisData {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$FilePath,
        
        [Parameter()]
        [string]$Pattern,
        
        [Parameter()]
        [string]$MetricName,
        
        [Parameter()]
        [double]$MetricThreshold,
        
        [Parameter()]
        [string]$Language,
        
        [Parameter()]
        [DateTime]$StartDate,
        
        [Parameter()]
        [DateTime]$EndDate,
        
        [Parameter()]
        [int]$MaxResults = 100
    )
    
    try {
        Assert-DatabaseInitialized
        $dbPath = Join-Path $script:DataConfig.SearchPath "analysis.db"
        
        $whereClause = New-Object System.Collections.Generic.List[string]
        $parameters = @{}
        
        if ($FilePath) {
            $whereClause.Add("ai.file_path LIKE @filePath")
            $parameters.filePath = "%$FilePath%"
        }
        
        if ($Pattern) {
            $whereClause.Add("pi.pattern_name LIKE @pattern")
            $parameters.pattern = "%$Pattern%"
        }
        
        if ($MetricName) {
            $whereClause.Add("mi.metric_name = @metricName")
            $parameters.metricName = $MetricName
            
            if ($MetricThreshold) {
                $whereClause.Add("mi.metric_value >= @metricThreshold")
                $parameters.metricThreshold = $MetricThreshold
            }
        }
        
        if ($Language) {
            $whereClause.Add("ai.language = @language")
            $parameters.language = $Language
        }
        
        if ($StartDate) {
            $whereClause.Add("ai.timestamp >= @startDate")
            $parameters.startDate = $StartDate.ToString('o')
        }
        
        if ($EndDate) {
            $whereClause.Add("ai.timestamp <= @endDate")
            $parameters.endDate = $EndDate.ToString('o')
        }
        
        $whereString = if ($whereClause.Count -gt 0) {
            "WHERE " + ($whereClause -join " AND ")
        } else { "" }
        
        $query = @"
SELECT DISTINCT ai.*, pi.pattern_name, pi.pattern_type, pi.line_number, pi.context,
       mi.metric_name, mi.metric_value
FROM analysis_index ai
LEFT JOIN pattern_index pi ON ai.id = pi.id
LEFT JOIN metrics_index mi ON ai.id = mi.id
$whereString
LIMIT @maxResults;
"@
        
        $parameters.maxResults = $MaxResults
        
        $results = Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters $parameters
        
        # Group and format results
        $groupedResults = $results | Group-Object -Property id | ForEach-Object {
            $first = $_.Group[0]
            
            @{
                id = $first.id
                filePath = $first.file_path
                language = $first.language
                analysisType = $first.analysis_type
                timestamp = [DateTime]::Parse($first.timestamp)
                patterns = @($_.Group | Where-Object pattern_name | Select-Object pattern_name, pattern_type, line_number, context)
                metrics = @($_.Group | Where-Object metric_name | Select-Object metric_name, metric_value)
                metadata = $first.metadata | ConvertFrom-Json
            }
        }
        
        return $groupedResults
    }
    catch {
        Write-Error "Failed to search analysis data: $_"
        throw
    }
}

function Get-AnalysisData {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Id
    )
    
    try {
        Assert-DatabaseInitialized
        $dbPath = Join-Path $script:DataConfig.SearchPath "analysis.db"
        
        # Get file path from index
        $query = "SELECT data_path FROM analysis_index WHERE id = @id;"
        $result = Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters @{ id = $Id }
        
        if (-not $result) {
            throw "Analysis data not found for ID: $Id"
        }
        
        # Read and decompress data
        $data = Get-Content $result.data_path | ConvertFrom-Json
        return $data
    }
    catch {
        Write-Error "Failed to get analysis data: $_"
        throw
    }
}

function Remove-OldAnalysisData {
    [CmdletBinding()]
    param(
        [Parameter()]
        [int]$RetentionDays = 30
    )
    
    try {
        Assert-DatabaseInitialized
        $dbPath = Join-Path $script:DataConfig.SearchPath "analysis.db"
        $cutoffDate = [DateTime]::UtcNow.AddDays(-$RetentionDays)
        
        # Get old analysis entries
        $query = "SELECT id, data_path FROM analysis_index WHERE timestamp < @cutoffDate;"
        $oldEntries = Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters @{
            cutoffDate = $cutoffDate.ToString('o')
        }
        
        foreach ($entry in $oldEntries) {
            # Remove data file
            if (Test-Path $entry.data_path) {
                Remove-Item $entry.data_path -Force
            }
            
            # Remove from indexes
            $queries = @(
                "DELETE FROM pattern_index WHERE id = @id;",
                "DELETE FROM metrics_index WHERE id = @id;",
                "DELETE FROM analysis_index WHERE id = @id;"
            )
            
            foreach ($deleteQuery in $queries) {
                Invoke-SqliteQuery -DataSource $dbPath -Query $deleteQuery -SqlParameters @{
                    id = $entry.id
                }
            }
        }
    }
    catch {
        Write-Error "Failed to remove old analysis data: $_"
        throw
    }
}

# Export functions
Export-ModuleMember -Function @(
    'Add-AnalysisData',
    'Search-AnalysisData',
    'Get-AnalysisData',
    'Remove-OldAnalysisData'
)
