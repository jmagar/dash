# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

function Initialize-Index {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Initializing code index" -Level INFO
        
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        # Create index directory if it doesn't exist
        $indexPath = $config.settings.Output.IndexDirectory
        if (-not (Test-Path $indexPath)) {
            New-Item -Path $indexPath -ItemType Directory -Force | Out-Null
        }
        
        # Initialize SQLite index database
        $dbPath = Join-Path $indexPath "code-index.db"
        
        # Create tables if they don't exist
        $createTableQueries = @{
            files = @"
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    language TEXT NOT NULL,
    last_modified TEXT NOT NULL,
    size INTEGER NOT NULL,
    hash TEXT NOT NULL,
    metadata TEXT
)
"@
            symbols = @"
CREATE TABLE IF NOT EXISTS symbols (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    column_number INTEGER NOT NULL,
    scope TEXT,
    metadata TEXT,
    FOREIGN KEY(file_id) REFERENCES files(id)
)
"@
            dependencies = @"
CREATE TABLE IF NOT EXISTS dependencies (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY(source_id) REFERENCES files(id),
    FOREIGN KEY(target_id) REFERENCES files(id)
)
"@
        }
        
        foreach ($table in $createTableQueries.Keys) {
            $query = $createTableQueries[$table]
            Invoke-SqliteQuery -DataSource $dbPath -Query $query
        }
        
        # Create indexes
        $createIndexQueries = @{
            files_path = "CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)"
            files_language = "CREATE INDEX IF NOT EXISTS idx_files_language ON files(language)"
            symbols_file = "CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_id)"
            symbols_name = "CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name)"
            dependencies_source = "CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_id)"
            dependencies_target = "CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_id)"
        }
        
        foreach ($index in $createIndexQueries.Keys) {
            $query = $createIndexQueries[$index]
            Invoke-SqliteQuery -DataSource $dbPath -Query $query
        }
        
        Write-StructuredLog -Message "Code index initialized successfully" -Level INFO
        return $true
    }
    catch {
        Write-StructuredLog -Message "Failed to initialize code index: $_" -Level ERROR
        return $false
    }
}

function Add-FileToIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [Parameter(Mandatory)]
        [string]$Language,
        [Parameter()]
        [hashtable]$Metadata = @{}
    )
    
    try {
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        $dbPath = Join-Path $config.settings.Output.IndexDirectory "code-index.db"
        
        # Get file info
        $file = Get-Item $Path
        $hash = (Get-FileHash $Path).Hash
        
        # Insert or update file
        $query = @"
INSERT OR REPLACE INTO files (
    id,
    path,
    language,
    last_modified,
    size,
    hash,
    metadata
) VALUES (
    @id,
    @path,
    @language,
    @last_modified,
    @size,
    @hash,
    @metadata
)
"@
        
        $params = @{
            id = [guid]::NewGuid().ToString()
            path = $Path
            language = $Language
            last_modified = $file.LastWriteTime.ToString('o')
            size = $file.Length
            hash = $hash
            metadata = ($Metadata | ConvertTo-Json -Compress)
        }
        
        Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters $params
        
        Write-StructuredLog -Message "File added to index successfully" -Level INFO
        return $params.id
    }
    catch {
        Write-StructuredLog -Message "Failed to add file to index: $_" -Level ERROR
        return $null
    }
}

function Add-SymbolToIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FileId,
        [Parameter(Mandatory)]
        [string]$Name,
        [Parameter(Mandatory)]
        [string]$Type,
        [Parameter(Mandatory)]
        [int]$LineNumber,
        [Parameter(Mandatory)]
        [int]$ColumnNumber,
        [Parameter()]
        [string]$Scope,
        [Parameter()]
        [hashtable]$Metadata = @{}
    )
    
    try {
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        $dbPath = Join-Path $config.settings.Output.IndexDirectory "code-index.db"
        
        # Insert symbol
        $query = @"
INSERT INTO symbols (
    id,
    file_id,
    name,
    type,
    line_number,
    column_number,
    scope,
    metadata
) VALUES (
    @id,
    @file_id,
    @name,
    @type,
    @line_number,
    @column_number,
    @scope,
    @metadata
)
"@
        
        $params = @{
            id = [guid]::NewGuid().ToString()
            file_id = $FileId
            name = $Name
            type = $Type
            line_number = $LineNumber
            column_number = $ColumnNumber
            scope = $Scope
            metadata = ($Metadata | ConvertTo-Json -Compress)
        }
        
        Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters $params
        
        Write-StructuredLog -Message "Symbol added to index successfully" -Level INFO
        return $params.id
    }
    catch {
        Write-StructuredLog -Message "Failed to add symbol to index: $_" -Level ERROR
        return $null
    }
}

function Add-DependencyToIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$SourceId,
        [Parameter(Mandatory)]
        [string]$TargetId,
        [Parameter(Mandatory)]
        [string]$Type,
        [Parameter()]
        [hashtable]$Metadata = @{}
    )
    
    try {
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        $dbPath = Join-Path $config.settings.Output.IndexDirectory "code-index.db"
        
        # Insert dependency
        $query = @"
INSERT INTO dependencies (
    id,
    source_id,
    target_id,
    type,
    metadata
) VALUES (
    @id,
    @source_id,
    @target_id,
    @type,
    @metadata
)
"@
        
        $params = @{
            id = [guid]::NewGuid().ToString()
            source_id = $SourceId
            target_id = $TargetId
            type = $Type
            metadata = ($Metadata | ConvertTo-Json -Compress)
        }
        
        Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters $params
        
        Write-StructuredLog -Message "Dependency added to index successfully" -Level INFO
        return $params.id
    }
    catch {
        Write-StructuredLog -Message "Failed to add dependency to index: $_" -Level ERROR
        return $null
    }
}

function Close-CodeIndex {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Closing code index" -Level INFO
        
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        $dbPath = Join-Path $config.settings.Output.IndexDirectory "code-index.db"
        
        # Optimize database
        $query = "VACUUM"
        Invoke-SqliteQuery -DataSource $dbPath -Query $query
        
        Write-StructuredLog -Message "Code index closed successfully" -Level INFO
        return $true
    }
    catch {
        Write-StructuredLog -Message "Failed to close code index: $_" -Level ERROR
        return $false
    }
}

Export-ModuleMember -Function Initialize-Index, Add-FileToIndex, Add-SymbolToIndex, Add-DependencyToIndex, Close-CodeIndex
