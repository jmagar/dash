# Data management and indexing system
using namespace System.Collections.Concurrent
using namespace System.Management.Automation.Language

# Configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

# Thread-safe data storage
$script:DataStore = [ConcurrentDictionary[string, object]]::new()
$script:AnalysisResults = [ConcurrentDictionary[string, object]]::new()

function Initialize-DataStore {
    [CmdletBinding()]
    param(
        [switch]$Force
    )
    
    try {
        # Initialize the data stores if they don't exist or if Force is specified
        if ($Force -or -not $script:DataStore) {
            $script:DataStore = [ConcurrentDictionary[string, object]]::new()
        }
        if ($Force -or -not $script:AnalysisResults) {
            $script:AnalysisResults = [ConcurrentDictionary[string, object]]::new()
        }

        # Initialize search database
        Initialize-SearchDatabase -Force:$Force

        Write-Verbose "Successfully initialized data store"
        return $true
    }
    catch {
        Write-Error "Failed to initialize data store: $_"
        return $false
    }
}

function Initialize-SearchDatabase {
    [CmdletBinding()]
    param(
        [switch]$Force
    )
    
    try {
        # Check if database already exists and is valid
        $dbPath = Join-Path $script:Config.fileSystem.outputDirectory "analysis.db"
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
        $null = New-Item -Path (Split-Path $dbPath -Parent) -ItemType Directory -Force
        
        $queries = @(
            "CREATE TABLE IF NOT EXISTS analysis_index (
                id TEXT PRIMARY KEY,
                file_path TEXT,
                language TEXT,
                analysis_type TEXT,
                timestamp DATETIME,
                data TEXT
            );",
            "CREATE INDEX IF NOT EXISTS idx_filepath ON analysis_index(file_path);",
            "CREATE INDEX IF NOT EXISTS idx_language ON analysis_index(language);",
            "CREATE INDEX IF NOT EXISTS idx_type ON analysis_index(analysis_type);",
            "CREATE INDEX IF NOT EXISTS idx_timestamp ON analysis_index(timestamp);",
            
            "CREATE TABLE IF NOT EXISTS pattern_index (
                id TEXT,
                pattern_name TEXT,
                pattern_type TEXT,
                line_number INTEGER,
                context TEXT,
                FOREIGN KEY(id) REFERENCES analysis_index(id)
            );",
            "CREATE INDEX IF NOT EXISTS idx_pattern ON pattern_index(pattern_name, pattern_type);",
            
            "CREATE TABLE IF NOT EXISTS metrics_index (
                id TEXT,
                metric_name TEXT,
                metric_value REAL,
                FOREIGN KEY(id) REFERENCES analysis_index(id)
            );",
            "CREATE INDEX IF NOT EXISTS idx_metric ON metrics_index(metric_name);"
        )

        foreach ($query in $queries) {
            Invoke-SqliteQuery -DataSource $dbPath -Query $query
        }

        Write-Verbose "Successfully initialized search database at $dbPath"
        return $true
    }
    catch {
        Write-Error "Failed to initialize search database: $_"
        return $false
    }
}

function Add-AnalysisData {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [hashtable]$Data
    )

    try {
        # Connect to SQLite database
        $dbPath = Join-Path $script:Config.fileSystem.outputDirectory 'analysis.db'
        $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
        $conn.Open()

        # Create tables if they don't exist
        $createTableCmd = $conn.CreateCommand()
        $createTableCmd.CommandText = @"
CREATE TABLE IF NOT EXISTS analysis_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    data_type TEXT NOT NULL,
    data_json TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_file_path ON analysis_data(file_path);
CREATE INDEX IF NOT EXISTS idx_data_type ON analysis_data(data_type);
"@
        $createTableCmd.ExecuteNonQuery()

        # Insert or update data
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = @"
INSERT OR REPLACE INTO analysis_data (file_path, data_type, data_json)
VALUES (@path, @type, @data)
"@
        $cmd.Parameters.AddWithValue("@path", $FilePath)
        $cmd.Parameters.AddWithValue("@type", $Data.Type)
        $cmd.Parameters.AddWithValue("@data", (ConvertTo-Json $Data -Depth 10 -Compress))
        $cmd.ExecuteNonQuery()

        $conn.Close()
        return $true
    }
    catch {
        Write-Error "Failed to add analysis data: $_"
        if ($conn) { $conn.Close() }
        return $false
    }
}

function Search-AnalysisData {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$FilePath,
        [Parameter()]
        [string]$DataType,
        [Parameter()]
        [string]$Query,
        [Parameter()]
        [int]$MaxResults = 100
    )

    try {
        # Connect to SQLite database
        $dbPath = Join-Path $script:Config.fileSystem.outputDirectory 'analysis.db'
        $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
        $conn.Open()

        # Build query
        $whereClause = @()
        $parameters = @{}

        if ($FilePath) {
            $whereClause += "file_path = @path"
            $parameters['@path'] = $FilePath
        }
        if ($DataType) {
            $whereClause += "data_type = @type"
            $parameters['@type'] = $DataType
        }
        if ($Query) {
            $whereClause += "data_json LIKE @query"
            $parameters['@query'] = "%$Query%"
        }

        $sql = "SELECT * FROM analysis_data"
        if ($whereClause) {
            $sql += " WHERE " + ($whereClause -join " AND ")
        }
        $sql += " ORDER BY timestamp DESC LIMIT @limit"
        $parameters['@limit'] = $MaxResults

        # Execute query
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $sql
        foreach ($param in $parameters.GetEnumerator()) {
            $cmd.Parameters.AddWithValue($param.Key, $param.Value)
        }

        $reader = $cmd.ExecuteReader()
        $results = @()
        while ($reader.Read()) {
            $results += @{
                FilePath = $reader["file_path"]
                Type = $reader["data_type"]
                Data = ConvertFrom-Json $reader["data_json"]
                Timestamp = $reader["timestamp"]
            }
        }

        $conn.Close()
        return $results
    }
    catch {
        Write-Error "Failed to search analysis data: $_"
        if ($conn) { $conn.Close() }
        return @()
    }
}

function Get-AnalysisResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter()]
        [string]$DataType
    )

    try {
        # Connect to SQLite database
        $dbPath = Join-Path $script:Config.fileSystem.outputDirectory 'analysis.db'
        $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
        $conn.Open()

        # Build query
        $sql = "SELECT * FROM analysis_data WHERE file_path = @path"
        if ($DataType) {
            $sql += " AND data_type = @type"
        }
        $sql += " ORDER BY timestamp DESC LIMIT 1"

        # Execute query
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $sql
        $cmd.Parameters.AddWithValue("@path", $FilePath)
        if ($DataType) {
            $cmd.Parameters.AddWithValue("@type", $DataType)
        }

        $reader = $cmd.ExecuteReader()
        if ($reader.Read()) {
            $result = @{
                FilePath = $reader["file_path"]
                Type = $reader["data_type"]
                Data = ConvertFrom-Json $reader["data_json"]
                Timestamp = $reader["timestamp"]
            }
        }
        else {
            $result = $null
        }

        $conn.Close()
        return $result
    }
    catch {
        Write-Error "Failed to get analysis result: $_"
        if ($conn) { $conn.Close() }
        return $null
    }
}

function Remove-AnalysisData {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter()]
        [string]$DataType
    )

    try {
        # Connect to SQLite database
        $dbPath = Join-Path $script:Config.fileSystem.outputDirectory 'analysis.db'
        $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
        $conn.Open()

        # Build query
        $sql = "DELETE FROM analysis_data WHERE file_path = @path"
        if ($DataType) {
            $sql += " AND data_type = @type"
        }

        # Execute query
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $sql
        $cmd.Parameters.AddWithValue("@path", $FilePath)
        if ($DataType) {
            $cmd.Parameters.AddWithValue("@type", $DataType)
        }

        $rowsAffected = $cmd.ExecuteNonQuery()
        $conn.Close()
        
        Write-Verbose "Removed $rowsAffected analysis data entries"
        return $true
    }
    catch {
        Write-Error "Failed to remove analysis data: $_"
        if ($conn) { $conn.Close() }
        return $false
    }
}

function Clear-AnalysisData {
    [CmdletBinding()]
    param()

    try {
        # Connect to SQLite database
        $dbPath = Join-Path $script:Config.fileSystem.outputDirectory 'analysis.db'
        $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
        $conn.Open()

        # Delete all data
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "DELETE FROM analysis_data"
        $rowsAffected = $cmd.ExecuteNonQuery()

        $conn.Close()
        Write-Verbose "Cleared $rowsAffected analysis data entries"
        return $true
    }
    catch {
        Write-Error "Failed to clear analysis data: $_"
        if ($conn) { $conn.Close() }
        return $false
    }
}

# Initialize data store on module load
Initialize-DataStore

# Export functions
Export-ModuleMember -Function @(
    'Add-AnalysisData',
    'Search-AnalysisData',
    'Get-AnalysisData',
    'Remove-OldAnalysisData',
    'Add-AnalysisResult',
    'Get-AnalysisResult',
    'Get-AnalysisStatistics',
    'Clear-OldResults'
)
