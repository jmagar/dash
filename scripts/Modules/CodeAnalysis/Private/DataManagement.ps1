# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

function Initialize-DataStore {
    [CmdletBinding()]
    param()
    
    try {
        # Initialize logging if not already initialized
        if (-not $script:LogConfig) {
            Initialize-Logging | Out-Null
        }
        
        Write-StructuredLog -Message "Initializing data store" -Level INFO
        
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        # Create data directory if it doesn't exist
        $dataPath = $config.settings.Output.DataDirectory
        if (-not (Test-Path $dataPath)) {
            New-Item -Path $dataPath -ItemType Directory -Force | Out-Null
        }
        
        # Initialize SQLite database
        $dbPath = Join-Path $dataPath "analysis.db"
        
        # Create tables if they don't exist
        $createTableQueries = @{
            analysis = @"
CREATE TABLE IF NOT EXISTS analysis (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    language TEXT NOT NULL,
    pattern TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_number INTEGER,
    content TEXT,
    metadata TEXT
)
"@
            patterns = @"
CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    type TEXT NOT NULL,
    regex TEXT NOT NULL,
    severity TEXT,
    description TEXT,
    metadata TEXT
)
"@
            metrics = @"
CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    metadata TEXT
)
"@
        }
        
        foreach ($table in $createTableQueries.Keys) {
            $query = $createTableQueries[$table]
            Invoke-SqliteQuery -DataSource $dbPath -Query $query
        }
        
        # Create indexes
        $createIndexQueries = @{
            analysis_timestamp = "CREATE INDEX IF NOT EXISTS idx_analysis_timestamp ON analysis(timestamp)"
            analysis_language = "CREATE INDEX IF NOT EXISTS idx_analysis_language ON analysis(language)"
            analysis_pattern = "CREATE INDEX IF NOT EXISTS idx_analysis_pattern ON analysis(pattern)"
            patterns_language = "CREATE INDEX IF NOT EXISTS idx_patterns_language ON patterns(language)"
            patterns_name = "CREATE INDEX IF NOT EXISTS idx_patterns_name ON patterns(name)"
            metrics_timestamp = "CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)"
            metrics_type = "CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(type)"
        }
        
        foreach ($index in $createIndexQueries.Keys) {
            $query = $createIndexQueries[$index]
            Invoke-SqliteQuery -DataSource $dbPath -Query $query
        }
        
        Write-StructuredLog -Message "Data store initialized successfully" -Level INFO -Properties @{
            path = $dbPath
            tables = $createTableQueries.Keys
            indexes = $createIndexQueries.Keys
        }
        
        return $true
    }
    catch {
        Write-StructuredLog -Message "Failed to initialize data store: $_" -Level ERROR -Properties @{
            error = $_.Exception.Message
            stackTrace = $_.ScriptStackTrace
        }
        return $false
    }
}

function Add-AnalysisResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$AnalysisData
    )
    
    try {
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        $dbPath = Join-Path $config.settings.Output.DataDirectory "analysis.db"
        
        # Insert analysis result
        $query = @"
INSERT INTO analysis (
    id,
    timestamp,
    language,
    pattern,
    file_path,
    line_number,
    content,
    metadata
) VALUES (
    @id,
    @timestamp,
    @language,
    @pattern,
    @file_path,
    @line_number,
    @content,
    @metadata
)
"@
        
        $params = @{
            id = [guid]::NewGuid().ToString()
            timestamp = (Get-Date).ToString('o')
            language = $AnalysisData.language
            pattern = $AnalysisData.pattern
            file_path = $AnalysisData.file_path
            line_number = $AnalysisData.line_number
            content = $AnalysisData.content
            metadata = ($AnalysisData.metadata | ConvertTo-Json -Compress)
        }
        
        Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters $params
        
        Write-StructuredLog -Message "Analysis result added successfully" -Level INFO -Properties @{
            id = $params.id
            language = $params.language
            pattern = $params.pattern
        }
        
        return $true
    }
    catch {
        Write-StructuredLog -Message "Failed to add analysis result: $_" -Level ERROR -Properties @{
            error = $_.Exception.Message
            stackTrace = $_.ScriptStackTrace
        }
        return $false
    }
}

function Get-AnalysisResults {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$Language,
        [Parameter()]
        [string]$Pattern,
        [Parameter()]
        [DateTime]$StartTime,
        [Parameter()]
        [DateTime]$EndTime
    )
    
    try {
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        $dbPath = Join-Path $config.settings.Output.DataDirectory "analysis.db"
        
        # Build query
        $query = "SELECT * FROM analysis WHERE 1=1"
        $params = @{}
        
        if ($Language) {
            $query += " AND language = @language"
            $params['language'] = $Language
        }
        
        if ($Pattern) {
            $query += " AND pattern = @pattern"
            $params['pattern'] = $Pattern
        }
        
        if ($StartTime) {
            $query += " AND timestamp >= @start_time"
            $params['start_time'] = $StartTime.ToString('o')
        }
        
        if ($EndTime) {
            $query += " AND timestamp <= @end_time"
            $params['end_time'] = $EndTime.ToString('o')
        }
        
        $queryResults = Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters $params
        
        Write-StructuredLog -Message "Retrieved analysis results successfully" -Level INFO -Properties @{
            count = $queryResults.Count
            filters = $params
        }
        
        return $queryResults
    }
    catch {
        Write-StructuredLog -Message "Failed to get analysis results: $_" -Level ERROR -Properties @{
            error = $_.Exception.Message
            stackTrace = $_.ScriptStackTrace
        }
        return @()
    }
}

Export-ModuleMember -Function Initialize-DataStore, Add-AnalysisResult, Get-AnalysisResults
