# Data management and indexing system
using namespace System.Collections.Concurrent
using namespace System.Management.Automation.Language

# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

# Configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

# Initialize thread-safe storage
$script:DataStore = [ConcurrentDictionary[string,object]]::new()
$script:AnalysisResults = [ConcurrentDictionary[string,object]]::new()

function New-DataResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$DataType,
        [Parameter()]
        [string]$Identifier = ""
    )
    
    return @{
        metadata = @{
            operation = $Operation
            type = $DataType
            identifier = $Identifier
            timestamp = Get-Date -Format "o"
            version = "1.0"
        }
        data = @{
            type = $DataType
            size = 0
            format = "unknown"
            last_modified = Get-Date -Format "o"
        }
        storage = @{
            location = "memory"
            persistence = "temporary"
            compression = "none"
        }
        metrics = @{
            duration_ms = 0
            memory_mb = 0
            items_processed = 0
        }
        status = @{
            success = $true
            warnings = @()
            errors = @()
        }
    }
}

function Initialize-DataStore {
    [CmdletBinding()]
    param(
        [switch]$Force
    )
    
    try {
        Write-StructuredLog -Message "Initializing data store" -Level INFO
        $result = New-DataResult -Operation "initialize" -DataType "store"
        
        if ($Force -or -not $script:DataStore) {
            $script:DataStore = [ConcurrentDictionary[string, object]]::new()
            $result.storage.location = "memory"
            $result.storage.format = "concurrent_dictionary"
        }
        
        if ($Force -or -not $script:AnalysisResults) {
            $script:AnalysisResults = [ConcurrentDictionary[string, object]]::new()
        }

        # Initialize search database
        $dbResult = Initialize-SearchDatabase -Force:$Force
        if (-not $dbResult.status.success) {
            $result.status.success = $false
            $result.status.errors += $dbResult.status.errors
            return $result
        }
        
        Write-StructuredLog -Message "Successfully initialized data store" -Level INFO
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to initialize data store: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Initialize-SearchDatabase {
    [CmdletBinding()]
    param(
        [switch]$Force
    )
    
    try {
        Write-StructuredLog -Message "Initializing search database" -Level INFO
        $result = New-DataResult -Operation "initialize" -DataType "database"
        
        $dbPath = Get-DatabasePath
        if (-not $Force -and (Test-Path $dbPath)) {
            try {
                $null = Invoke-SqliteQuery -DataSource $dbPath -Query "SELECT 1;"
                $result.metrics.readCount++
                return $result
            }
            catch {
                Write-StructuredLog -Message "Existing database appears corrupted, recreating..." -Level WARN
                $result.status.warnings += "Database corrupted, recreating"
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
            $result.metrics.writeCount++
        }

        $result.storage.location = $dbPath
        $result.storage.format = "sqlite"
        Write-StructuredLog -Message "Successfully initialized search database" -Level INFO
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to initialize search database: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-DatabasePath {
    return Join-Path (Split-Path $PSScriptRoot -Parent) 'Data/analysis.db'
}

function Connect-Database {
    [CmdletBinding()]
    param(
        [Parameter()]
        [int]$MaxRetries = 3,
        [Parameter()]
        [int]$RetryDelayMs = 1000
    )
    
    try {
        Write-StructuredLog -Message "Connecting to database" -Level INFO
        $result = New-DataResult -Operation "connect" -DataType "connection"
        
        $retryCount = 0
        while ($retryCount -lt $MaxRetries) {
            try {
                $dbPath = Get-DatabasePath
                $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
                $conn.Open()
                
                $result.data.content = $conn
                $result.metrics.readCount++
                return $result
            }
            catch {
                $retryCount++
                if ($retryCount -ge $MaxRetries) {
                    throw "Failed to connect after $MaxRetries attempts"
                }
                Start-Sleep -Milliseconds $RetryDelayMs
                $result.status.warnings += "Retry attempt $retryCount"
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to connect to database: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
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
        Write-StructuredLog -Message "Adding analysis data for $FilePath" -Level INFO
        $result = New-DataResult -Operation "add" -DataType "analysis"
        
        # Validate data structure
        if (-not ($Data.Content -and 
                  $Data.Content.patterns -is [System.Collections.IDictionary] -and
                  $Data.Content.security -is [System.Collections.IDictionary] -and
                  $Data.Content.performance -is [System.Collections.IDictionary] -and
                  $Data.Content.refactoring -is [System.Collections.IDictionary])) {
            throw [System.ArgumentException]::new("Invalid analysis data structure")
        }

        # Create database entry
        $connResult = Connect-Database
        if (-not $connResult.status.success) {
            $result.status.success = $false
            $result.status.errors += $connResult.status.errors
            return $result
        }
        
        $conn = $connResult.data.content
        try {
            $timestamp = (Get-Date).ToString('o')
            $dataJson = $Data | ConvertTo-Json -Depth 10 -Compress
            
            $cmd = $conn.CreateCommand()
            $cmd.CommandText = @"
                INSERT OR REPLACE INTO analysis_index 
                (id, file_path, language, analysis_type, timestamp, data) 
                VALUES (@id, @path, @language, @type, @timestamp, @data)
"@
            $cmd.Parameters.AddWithValue("@id", [guid]::NewGuid().ToString())
            $cmd.Parameters.AddWithValue("@path", $FilePath)
            $cmd.Parameters.AddWithValue("@language", $Data.Language)
            $cmd.Parameters.AddWithValue("@type", "analysis")
            $cmd.Parameters.AddWithValue("@timestamp", $timestamp)
            $cmd.Parameters.AddWithValue("@data", $dataJson)

            $cmd.ExecuteNonQuery()
            $result.metrics.writeCount++
            
            Write-StructuredLog -Message "Successfully added analysis data" -Level INFO
            return $result
        }
        finally {
            $conn.Close()
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to add analysis data: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-AnalysisData {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter()]
        [string]$Language,
        [Parameter()]
        [string]$Type
    )
    
    try {
        Write-StructuredLog -Message "Retrieving analysis data for $FilePath" -Level INFO
        $result = New-DataResult -Operation "get" -DataType "query"
        
        $connResult = Connect-Database
        if (-not $connResult.status.success) {
            $result.status.success = $false
            $result.status.errors += $connResult.status.errors
            return $result
        }
        
        $conn = $connResult.data.content
        try {
            $query = "SELECT * FROM analysis_index WHERE file_path = @path"
            $params = @{ "@path" = $FilePath }
            
            if ($Language) {
                $query += " AND language = @language"
                $params["@language"] = $Language
            }
            if ($Type) {
                $query += " AND analysis_type = @type"
                $params["@type"] = $Type
            }
            
            $query += " ORDER BY timestamp DESC LIMIT 1"
            
            $cmd = $conn.CreateCommand()
            $cmd.CommandText = $query
            foreach ($param in $params.GetEnumerator()) {
                $cmd.Parameters.AddWithValue($param.Key, $param.Value)
            }
            
            $reader = $cmd.ExecuteReader()
            if ($reader.Read()) {
                $data = $reader["data"] | ConvertFrom-Json -AsHashtable
                $result.data.content = $data
                $result.metrics.readCount++
            }
            
            return $result
        }
        finally {
            $conn.Close()
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to retrieve analysis data: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Remove-AnalysisData {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter()]
        [string]$Language,
        [Parameter()]
        [string]$Type
    )
    
    try {
        Write-StructuredLog -Message "Removing analysis data for $FilePath" -Level INFO
        $result = New-DataResult -Operation "remove" -DataType "delete"
        
        $connResult = Connect-Database
        if (-not $connResult.status.success) {
            $result.status.success = $false
            $result.status.errors += $connResult.status.errors
            return $result
        }
        
        $conn = $connResult.data.content
        try {
            $query = "DELETE FROM analysis_index WHERE file_path = @path"
            $params = @{ "@path" = $FilePath }
            
            if ($Language) {
                $query += " AND language = @language"
                $params["@language"] = $Language
            }
            if ($Type) {
                $query += " AND analysis_type = @type"
                $params["@type"] = $Type
            }
            
            $cmd = $conn.CreateCommand()
            $cmd.CommandText = $query
            foreach ($param in $params.GetEnumerator()) {
                $cmd.Parameters.AddWithValue($param.Key, $param.Value)
            }
            
            $rowsAffected = $cmd.ExecuteNonQuery()
            $result.metrics.writeCount = $rowsAffected
            
            Write-StructuredLog -Message "Successfully removed analysis data" -Level INFO -Properties @{
                rowsAffected = $rowsAffected
            }
            
            return $result
        }
        finally {
            $conn.Close()
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to remove analysis data: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

Export-ModuleMember -Function Initialize-DataStore, Add-AnalysisData, Get-AnalysisData, Remove-AnalysisData
