using namespace System.Collections.Concurrent
using namespace System.Threading.Tasks

# Import required modules
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

# Thread-safe index storage
$script:AstCache = [ConcurrentDictionary[string,object]]::new()
$script:DependencyGraph = [ConcurrentDictionary[string,object]]::new()
$script:MLPredictionCache = [ConcurrentDictionary[string,object]]::new()

function New-IndexResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$IndexType,
        [Parameter()]
        [string]$Identifier = ""
    )
    
    return @{
        metadata = @{
            operation = $Operation
            type = $IndexType
            identifier = $Identifier
            timestamp = Get-Date -Format "o"
            version = "1.0"
        }
        index = @{
            type = $IndexType
            entries = 0
            size = 0
            last_modified = Get-Date -Format "o"
            format = "unknown"
        }
        metrics = @{
            duration_ms = 0
            memory_mb = 0
            items_processed = 0
            batch_size = 0
        }
        files = @{
            total = 0
            indexed = 0
            failed = 0
            skipped = 0
        }
        status = @{
            success = $true
            indexed = $false
            warnings = @()
            errors = @()
        }
    }
}

function Initialize-CodeIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$RootPath
    )

    try {
        Write-StructuredLog -Message "Initializing code index" -Level INFO
        $result = New-IndexResult -Operation "initialize" -IndexType "code"
        
        # Ensure all output directories exist
        $outputDir = Join-Path $PSScriptRoot "../Output"
        $indexPath = Join-Path $outputDir "index"
        $cachePath = Join-Path $outputDir "cache"
        $logsPath = Join-Path $outputDir "logs"
        $mlPath = Join-Path $outputDir "ml"

        foreach ($path in @($outputDir, $indexPath, $cachePath, $logsPath, $mlPath)) {
            if (-not (Test-Path $path)) {
                New-Item -Path $path -ItemType Directory -Force | Out-Null
            }
        }

        # Initialize SQLite database
        $dbPath = Join-Path $indexPath "codeindex.db"
        $result.storage.location = $dbPath
        
        $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
        $conn.Open()

        # Create tables if not exist
        $createTablesQuery = @"
CREATE TABLE IF NOT EXISTS analysis_index (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    language TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    data TEXT
);

CREATE TABLE IF NOT EXISTS pattern_index (
    id TEXT NOT NULL,
    pattern_name TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    risk_level TEXT,
    suggestion TEXT,
    context TEXT,
    confidence REAL,
    ml_prediction BOOLEAN,
    FOREIGN KEY (id) REFERENCES analysis_index(id)
);

CREATE TABLE IF NOT EXISTS metrics_index (
    id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    confidence REAL,
    ml_prediction BOOLEAN,
    FOREIGN KEY (id) REFERENCES analysis_index(id)
);

CREATE TABLE IF NOT EXISTS ml_predictions (
    id TEXT NOT NULL,
    model_type TEXT NOT NULL,
    model_version TEXT NOT NULL,
    prediction_data TEXT NOT NULL,
    confidence REAL NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (id) REFERENCES analysis_index(id)
);

CREATE INDEX IF NOT EXISTS idx_pattern_type ON pattern_index(pattern_type);
CREATE INDEX IF NOT EXISTS idx_risk_level ON pattern_index(risk_level);
CREATE INDEX IF NOT EXISTS idx_ml_prediction ON pattern_index(ml_prediction);
CREATE INDEX IF NOT EXISTS idx_confidence ON pattern_index(confidence);
CREATE INDEX IF NOT EXISTS idx_model_type ON ml_predictions(model_type);
CREATE INDEX IF NOT EXISTS idx_model_version ON ml_predictions(model_version);
"@

        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $createTablesQuery
        $cmd.ExecuteNonQuery()

        $conn.Close()
        Write-StructuredLog -Message "Successfully initialized code index" -Level INFO
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to initialize code index: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Add-FileToIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [string]$Language,
        [Parameter()]
        [object]$Ast = $null
    )

    try {
        Write-StructuredLog -Message "Adding file to index" -Level INFO
        $result = New-IndexResult -Operation "add" -IndexType "file"
        $startTime = Get-Date
        
        # Read file content if AST not provided
        if (-not $Ast) {
            $content = Get-Content -Path $FilePath -Raw
            $parserResult = Get-AstParser -Language $Language -Content $content
            if (-not $parserResult.success) {
                throw "Failed to parse file: $($parserResult.errors)"
            }
            $Ast = $parserResult.ast
        }

        # Get metrics and patterns
        $metrics = Get-AstMetrics -Ast $Ast -Language $Language
        $patterns = switch ($Language.ToLower()) {
            'powershell' { Get-PowerShellPatterns -Ast $Ast }
            'typescript' { Get-TypeScriptPatterns -Content $Ast.content }
            'javascript' { Get-JavaScriptPatterns -Content $Ast.content }
            default { @() }
        }

        # Generate unique ID for this analysis
        $id = [guid]::NewGuid().ToString()

        # Connect to SQLite database
        $dbPath = Join-Path $script:Config.fileSystem.outputDirectory "analysis.db"
        $result.storage.location = $dbPath
        
        $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
        $conn.Open()

        try {
            # Add to analysis_index
            $cmd = $conn.CreateCommand()
            $cmd.CommandText = @"
INSERT INTO analysis_index (id, file_path, language, analysis_type, timestamp, data)
VALUES (@id, @filePath, @language, 'file', @timestamp, @data);
"@
            $cmd.Parameters.AddWithValue("@id", $id)
            $cmd.Parameters.AddWithValue("@filePath", $FilePath)
            $cmd.Parameters.AddWithValue("@language", $Language)
            $cmd.Parameters.AddWithValue("@timestamp", (Get-Date).ToString('o'))
            $cmd.Parameters.AddWithValue("@data", ($metrics | ConvertTo-Json -Compress))
            $cmd.ExecuteNonQuery()
            
            $result.index.entries += @{
                id = $id
                path = $FilePath
                language = $Language
                metrics = $metrics
            }
            
            # Add patterns to pattern_index
            foreach ($pattern in $patterns) {
                $cmd = $conn.CreateCommand()
                $cmd.CommandText = @"
INSERT INTO pattern_index (id, pattern_name, pattern_type, line_number, risk_level, suggestion, context, confidence, ml_prediction)
VALUES (@id, @name, @type, @lineNumber, @risk, @suggestion, @context, @confidence, @mlPrediction);
"@
                $cmd.Parameters.AddWithValue("@id", $id)
                $cmd.Parameters.AddWithValue("@name", $pattern.Name)
                $cmd.Parameters.AddWithValue("@type", $pattern.Type)
                $cmd.Parameters.AddWithValue("@lineNumber", $pattern.Line)
                $cmd.Parameters.AddWithValue("@risk", $pattern.Risk)
                $cmd.Parameters.AddWithValue("@suggestion", $pattern.Suggestion)
                $cmd.Parameters.AddWithValue("@context", $pattern.Context)
                $cmd.Parameters.AddWithValue("@confidence", 1.0)
                $cmd.Parameters.AddWithValue("@mlPrediction", $false)
                $cmd.ExecuteNonQuery()
                
                $result.index.patterns += $pattern
            }
            
            # Add metrics to metrics_index
            foreach ($metric in $metrics.GetEnumerator()) {
                $cmd = $conn.CreateCommand()
                $cmd.CommandText = @"
INSERT INTO metrics_index (id, metric_name, metric_value, confidence, ml_prediction)
VALUES (@id, @name, @value, @confidence, @mlPrediction);
"@
                $cmd.Parameters.AddWithValue("@id", $id)
                $cmd.Parameters.AddWithValue("@name", $metric.Key)
                $cmd.Parameters.AddWithValue("@value", $metric.Value)
                $cmd.Parameters.AddWithValue("@confidence", 1.0)
                $cmd.Parameters.AddWithValue("@mlPrediction", $false)
                $cmd.ExecuteNonQuery()
                
                $result.index.metrics += @{
                    name = $metric.Key
                    value = $metric.Value
                }
            }
            
            # Update metrics
            $result.metrics.duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            $result.metrics.memory_mb = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
            $result.metrics.items_processed = 1
            $result.metrics.batch_size = 100
            
            $result.files.total = 1
            $result.files.indexed = 1
            $result.files.failed = 0
            $result.files.skipped = 0
            
            Write-StructuredLog -Message "Successfully added file to index" -Level INFO -Properties @{
                patterns = $patterns.Count
                metrics = $metrics.Count
                duration_ms = $result.metrics.duration_ms
            }
            
            return $result
        }
        finally {
            $conn.Close()
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to add file to index: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Add-MLPredictionToIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Id,
        [Parameter(Mandatory)]
        [string]$ModelType,
        [Parameter(Mandatory)]
        [object]$Predictions,
        [Parameter(Mandatory)]
        [double]$Confidence
    )

    try {
        $dbPath = Join-Path (Join-Path $PSScriptRoot "../Output/index") "codeindex.db"
        $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath")
        $conn.Open()

        # Add ML prediction
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = @"
INSERT INTO ml_predictions (id, model_type, model_version, prediction_data, confidence, timestamp)
VALUES (@id, @modelType, @modelVersion, @predictionData, @confidence, @timestamp);
"@
        $cmd.Parameters.AddWithValue("@id", $Id)
        $cmd.Parameters.AddWithValue("@modelType", $ModelType)
        $cmd.Parameters.AddWithValue("@modelVersion", (Get-Content (Join-Path $script:Config.machineLearning.modelPath "version.json") | ConvertFrom-Json).version)
        $cmd.Parameters.AddWithValue("@predictionData", ($Predictions | ConvertTo-Json -Compress))
        $cmd.Parameters.AddWithValue("@confidence", $Confidence)
        $cmd.Parameters.AddWithValue("@timestamp", [DateTime]::UtcNow.ToString('o'))
        $cmd.ExecuteNonQuery()

        # Add patterns from ML predictions
        foreach ($prediction in $Predictions) {
            $lineNumber = 0
            if ($prediction.Location -and $prediction.Location.LineNumber) {
                $lineNumber = $prediction.Location.LineNumber
            }

            $cmd = $conn.CreateCommand()
            $cmd.CommandText = @"
INSERT INTO pattern_index (id, pattern_name, pattern_type, line_number, risk_level, suggestion, context, confidence, ml_prediction)
VALUES (@id, @name, @type, @lineNumber, @risk, @suggestion, @context, @confidence, @mlPrediction);
"@
            $cmd.Parameters.AddWithValue("@id", $Id)
            $cmd.Parameters.AddWithValue("@name", $prediction.Name)
            $cmd.Parameters.AddWithValue("@type", $ModelType)
            $cmd.Parameters.AddWithValue("@lineNumber", $lineNumber)
            $cmd.Parameters.AddWithValue("@risk", $prediction.Risk)
            $cmd.Parameters.AddWithValue("@suggestion", $prediction.Suggestion)
            $cmd.Parameters.AddWithValue("@context", ($prediction | ConvertTo-Json -Compress))
            $cmd.Parameters.AddWithValue("@confidence", $prediction.Confidence)
            $cmd.Parameters.AddWithValue("@mlPrediction", $true)
            $cmd.ExecuteNonQuery()
        }

        $conn.Close()
        return $true
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        if ($conn) { $conn.Close() }
        return $false
    }
}

function Update-DependencyGraph {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [object]$Ast,
        [Parameter(Mandatory)]
        [string]$Language
    )

    try {
        $dependencies = @()
        
        switch ($Language.ToLower()) {
            'powershell' {
                # Find module imports and dot-sourcing
                $visitor = {
                    param($node)
                    
                    if ($node -is [CommandAst]) {
                        $cmdName = $node.CommandElements[0].Value
                        if ($cmdName -eq 'Import-Module' -or $cmdName -eq '.') {
                            $path = $node.CommandElements[1].Value
                            if (-not [System.IO.Path]::IsPathRooted($path)) {
                                $path = Join-Path (Split-Path $FilePath) $path
                            }
                            $dependencies += $path
                        }
                    }
                    return $true
                }
                $Ast.Visit($visitor)
            }
            'typescript' {
                # Extract import statements
                $imports = [regex]::Matches($Ast.content, 'import.*?from\s+[''"](.+?)[''"]')
                foreach ($import in $imports) {
                    $path = $import.Groups[1].Value
                    if (-not [System.IO.Path]::IsPathRooted($path)) {
                        $path = Join-Path (Split-Path $FilePath) $path
                    }
                    $dependencies += $path
                }
            }
            'javascript' {
                # Extract require statements and imports
                $requires = [regex]::Matches($Ast.content, '(?:require|import).*?[''"](.+?)[''"]')
                foreach ($req in $requires) {
                    $path = $req.Groups[1].Value
                    if (-not [System.IO.Path]::IsPathRooted($path)) {
                        $path = Join-Path (Split-Path $FilePath) $path
                    }
                    $dependencies += $path
                }
            }
        }

        # Update dependency graph
        $script:DependencyGraph[$FilePath] = @{
            Dependencies = $dependencies
            LastUpdated = Get-Date
        }
    }
    catch {
        Write-Warning ("Failed to update dependency graph for {0}: {1}" -f $FilePath, $_.Exception.Message)
    }
}

function Get-IndexedFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath
    )

    try {
        # Search SQLite database
        $file = Get-FileFromSearchDatabase -FilePath $FilePath

        if ($file) {
            $indexEntry = @{
                FilePath = $file.FilePath
                Language = $file.Language
                LastAnalyzed = $file.LastAnalyzed
                Metrics = $file.Metrics
                Patterns = $file.Patterns
                Hash = $file.Hash
            }

            # Check if file has changed
            $currentHash = (Get-FileHash -Path $FilePath).Hash
            if ($indexEntry.Hash -eq $currentHash) {
                return $indexEntry
            }
        }
    }
    catch {
        Write-Warning "Failed to retrieve indexed file: $_"
    }
    return $null
}

function Initialize-Index {
    [CmdletBinding()]
    param(
        [switch]$Force
    )
    
    try {
        Initialize-SearchDatabase -Force
        Write-Verbose "Index initialized successfully"
        return $true
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Error "Failed to initialize index: $errorMessage"
        return $false
    }
}

function Add-FileToIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        
        [Parameter()]
        [string[]]$Tags,
        
        [Parameter()]
        [hashtable]$Metadata
    )
    
    try {
        Add-FileToSearchDatabase -FilePath $FilePath -Tags $Tags -Metadata $Metadata
        Write-Verbose "File indexed successfully: $FilePath"
        return $true
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Error "Failed to index file ${FilePath}: $errorMessage"
        return $false
    }
}

function Add-PatternToIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Pattern,
        
        [Parameter(Mandatory)]
        [string]$FilePath
    )
    
    try {
        Add-PatternToSearchDatabase -Pattern $Pattern -FilePath $FilePath
        Write-Verbose "Pattern indexed successfully: $Pattern"
        return $true
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Error "Failed to index pattern ${Pattern}: $errorMessage"
        return $false
    }
}

function Search-Index {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$Pattern,
        
        [Parameter()]
        [string[]]$Tags,
        
        [Parameter()]
        [hashtable]$Metadata
    )
    
    try {
        $results = Search-SearchDatabase -Pattern $Pattern -Tags $Tags -Metadata $Metadata
        return $results
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Error "Failed to search index: $errorMessage"
        return @()
    }
}

function Update-Index {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string[]]$Directories,
        [Parameter()]
        [string[]]$FileTypes = @('.ps1', '.psm1', '.ts', '.js'),
        [Parameter()]
        [switch]$Force
    )

    try {
        # Use provided directories or default to root path
        if (-not $Directories) {
            $Directories = @($script:RootPath)
        }

        # Get all files to process
        $files = foreach ($dir in $Directories) {
            Get-ChildItem -Path $dir -Recurse -File | 
                Where-Object { $FileTypes -contains $_.Extension }
        }

        $totalFiles = $files.Count
        Write-Verbose "Found $totalFiles files to process"

        # Process files in parallel
        $jobs = @()
        $batchSize = 10
        for ($i = 0; $i -lt $totalFiles; $i += $batchSize) {
            $batch = $files[$i..([Math]::Min($i + $batchSize - 1, $totalFiles - 1))]
            
            $job = Start-ThreadJob -ScriptBlock {
                param($batch, $Force)
                
                foreach ($file in $batch) {
                    try {
                        # Skip if already indexed and not forced
                        if (-not $Force) {
                            $indexed = Get-IndexedFile -FilePath $file.FullName
                            if ($indexed) { continue }
                        }

                        # Get file content and language
                        $content = Get-Content -Path $file.FullName -Raw
                        $language = switch ($file.Extension.ToLower()) {
                            '.ps1' { 'PowerShell' }
                            '.psm1' { 'PowerShell' }
                            '.ts' { 'TypeScript' }
                            '.js' { 'JavaScript' }
                            default { 'Unknown' }
                        }

                        # Get AST and analyze
                        $analysis = Get-AstAnalysis -FilePath $file.FullName -Content $content -Language $language
                        
                        # Add to index
                        Add-FileToIndex -FilePath $file.FullName -Language $language -Ast $analysis.Ast

                        # Store analysis results
                        Add-AnalysisData -FilePath $file.FullName -Data @{
                            Language = $language
                            Type = 'CodeAnalysis'
                            Metrics = $analysis.Metrics
                            Patterns = $analysis.Patterns
                            Symbols = $analysis.Symbols
                            SecurityIssues = $analysis.SecurityIssues
                            CodeSmells = $analysis.CodeSmells
                            ParseErrors = $analysis.ParseErrors
                        }
                    }
                    catch {
                        Write-Warning "Failed to process $($file.FullName): $_"
                    }
                }
            } -ArgumentList $batch, $Force

            $jobs += $job
        }

        # Wait for all jobs to complete
        $jobs | Wait-Job | Receive-Job
        $jobs | Remove-Job

        Write-Verbose "Index update completed"
        return $true
    }
    catch {
        Write-Error "Failed to update index: $_"
        return $false
    }
}

function Get-RiskProfile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath
    )

    try {
        Write-StructuredLog -Message "Getting risk profile" -Level INFO -Properties @{
            filePath = $FilePath
        }

        $dbPath = Join-Path $script:Config.fileSystem.outputDirectory "analysis.db"
        
        # Get latest analysis for the file
        $query = @"
SELECT TOP 1
    ai.id,
    ai.data,
    (SELECT COUNT(*) FROM pattern_index WHERE id = ai.id AND pattern_type = 'security') as security_issues,
    (SELECT COUNT(*) FROM pattern_index WHERE id = ai.id AND pattern_type = 'performance') as performance_issues,
    (SELECT metric_value FROM metrics_index WHERE id = ai.id AND metric_name = 'complexity') as complexity,
    (SELECT metric_value FROM metrics_index WHERE id = ai.id AND metric_name = 'loc') as loc
FROM analysis_index ai
WHERE ai.file_path = @filePath
ORDER BY ai.timestamp DESC;
"@

        $result = Invoke-SqliteQuery -DataSource $dbPath -Query $query -SqlParameters @{
            filePath = $FilePath
        }

        if (-not $result) {
            throw "No analysis data found for file: $FilePath"
        }

        $riskScore = 0
        $riskFactors = @()

        # Calculate risk based on metrics
        if ($result.complexity -gt 30) {
            $riskScore += 3
            $riskFactors += "High complexity ($($result.complexity))"
        }
        elseif ($result.complexity -gt 15) {
            $riskScore += 1
            $riskFactors += "Medium complexity ($($result.complexity))"
        }

        if ($result.security_issues -gt 0) {
            $riskScore += 3
            $riskFactors += "$($result.security_issues) security issues"
        }

        if ($result.performance_issues -gt 0) {
            $riskScore += 2
            $riskFactors += "$($result.performance_issues) performance issues"
        }

        if ($result.loc -gt 1000) {
            $riskScore += 2
            $riskFactors += "Large file size ($($result.loc) lines)"
        }

        $riskLevel = switch ($riskScore) {
            { $_ -gt 7 } { "High" }
            { $_ -gt 4 } { "Medium" }
            default { "Low" }
        }

        $fileProfile = @{
            FilePath = $FilePath
            RiskLevel = $riskLevel
            RiskScore = $riskScore
            RiskFactors = $riskFactors
            Metrics = $result.data | ConvertFrom-Json
            LastAnalyzed = $result.timestamp
        }

        Write-StructuredLog -Message "Risk profile generated" -Level INFO -Properties @{
            filePath = $FilePath
            riskLevel = $riskLevel
            riskScore = $riskScore
        }

        return $fileProfile
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        return $null
    }
}

function Update-CodeIndex {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter()]
        [switch]$Force
    )

    try {
        # Check if file exists
        if (-not (Test-Path $FilePath)) {
            throw "File not found: $FilePath"
        }

        # Get file content and language
        $content = Get-Content -Path $FilePath -Raw
        $language = switch ([System.IO.Path]::GetExtension($FilePath).ToLower()) {
            '.ps1' { 'PowerShell' }
            '.psm1' { 'PowerShell' }
            '.ts' { 'TypeScript' }
            '.js' { 'JavaScript' }
            default { throw "Unsupported file type: $([System.IO.Path]::GetExtension($FilePath))" }
        }

        # Skip if already indexed and not forced
        if (-not $Force) {
            $indexed = Get-IndexedFile -FilePath $FilePath
            if ($indexed) { 
                Write-Verbose "File already indexed: $FilePath"
                return $true 
            }
        }

        # Analyze code
        $analysis = Get-AstAnalysis -FilePath $FilePath -Content $content -Language $language
        
        # Add to index
        Add-FileToIndex -FilePath $FilePath -Language $language -Ast $analysis.Ast

        # Store analysis results
        Add-AnalysisData -FilePath $FilePath -Data @{
            Language = $language
            Type = 'CodeAnalysis'
            Metrics = $analysis.Metrics
            Patterns = $analysis.Patterns
            Symbols = $analysis.Symbols
            SecurityIssues = $analysis.SecurityIssues
            CodeSmells = $analysis.CodeSmells
            ParseErrors = $analysis.ParseErrors
        }

        Write-Verbose "Successfully updated index for $FilePath"
        return $true
    }
    catch {
        Write-Error ("Failed to update code index for {0}: {1}" -f $FilePath, $_.Exception.Message)
        return $false
    }
}

function Close-CodeIndex {
    [CmdletBinding()]
    param()
    
    try {
        return $true
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Error "Failed to close code index: $errorMessage"
        return $false
    }
}

# Initialize index on module load
Initialize-Index

# Export functions
Export-ModuleMember -Function @(
    'Initialize-CodeIndex',
    'Add-FileToIndex',
    'Search-CodeIndex',
    'Update-CodeIndex',
    'Close-CodeIndex',
    'Initialize-Index',
    'Add-FileToIndex',
    'Add-PatternToIndex',
    'Search-Index',
    'Update-Index',
    'Add-MLPredictionToIndex'
)
