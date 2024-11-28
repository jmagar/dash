using namespace System.Management.Automation.Language

# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1
. $PSScriptRoot/Caching.ps1

$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

# Backend pattern categories
$script:BackendPatterns = @{
    Database = @{
        Patterns = @(
            @{
                Name = "SQL"
                Signatures = @("sql.Open", "database/sql", "gorm", "sqlx")
                Language = "go"
            },
            @{
                Name = "MongoDB"
                Signatures = @("mongo.Connect", "go.mongodb.org/mongo-driver")
                Language = "go"
            }
        )
    }
    API = @{
        Patterns = @(
            @{
                Name = "REST"
                Signatures = @("http.HandleFunc", "mux.Router", "gin.Engine")
                Language = "go"
            },
            @{
                Name = "GraphQL"
                Signatures = @("graphql-go", "gqlgen")
                Language = "go"
            }
        )
    }
    Authentication = @{
        Patterns = @(
            @{
                Name = "JWT"
                Signatures = @("jwt.Parse", "jwt.Sign", "github.com/dgrijalva/jwt-go")
                Language = "go"
            },
            @{
                Name = "OAuth"
                Signatures = @("oauth2", "github.com/golang/oauth2")
                Language = "go"
            }
        )
    }
    Caching = @{
        Patterns = @(
            @{
                Name = "Redis"
                Signatures = @("redis.NewClient", "github.com/go-redis/redis")
                Language = "go"
            },
            @{
                Name = "MemCache"
                Signatures = @("memcache.New", "github.com/bradfitz/gomemcache")
                Language = "go"
            }
        )
    }
    MessageQueue = @{
        Patterns = @(
            @{
                Name = "RabbitMQ"
                Signatures = @("amqp.Dial", "github.com/streadway/amqp")
                Language = "go"
            },
            @{
                Name = "Kafka"
                Signatures = @("kafka.NewReader", "github.com/segmentio/kafka-go")
                Language = "go"
            }
        )
    }
    Monitoring = @{
        Patterns = @(
            @{
                Name = "Prometheus"
                Signatures = @("prometheus.NewCounter", "github.com/prometheus/client_golang")
                Language = "go"
            },
            @{
                Name = "OpenTelemetry"
                Signatures = @("go.opentelemetry.io/otel")
                Language = "go"
            }
        )
    }
}

function New-PatternResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$PatternId,
        [Parameter()]
        [hashtable]$Properties = @{}
    )
    
    return @{
        metadata = @{
            operation = $Operation
            pattern_id = $PatternId
            timestamp = Get-Date -Format "o"
            version = "1.0"
            session_id = $script:Config.SessionId
        }
        pattern = @{
            properties = $Properties
            matches = @()
            statistics = @{
                total_matches = 0
                file_count = 0
                line_count = 0
            }
        }
        metrics = @{
            duration_ms = 0
            items_processed = 0
            memory_used_mb = 0
        }
        status = @{
            success = $true
            warnings = @()
            errors = @()
        }
    }
}

function Find-CodePattern {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$PatternId,
        [Parameter(Mandatory)]
        [string]$Pattern,
        [Parameter()]
        [string[]]$FileTypes = @('*.go', '*.rs', '*.java', '*.cs'),
        [Parameter()]
        [string]$RootPath = (Get-Location).Path,
        [Parameter()]
        [switch]$UseCache
    )
    
    try {
        Write-StructuredLog -Message "Finding code pattern" -Level INFO
        $startTime = Get-Date
        
        $result = New-PatternResult -Operation "find" -PatternId $PatternId
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Create error log path
        $errorLogPath = Join-Path $RootPath "$PatternId.error.log"
        
        # Check cache if requested
        if ($UseCache) {
            $cacheKey = "pattern_$PatternId"
            $cached = Get-CacheValue -Key $cacheKey
            if ($cached.cache.value) {
                Write-StructuredLog -Message "Using cached pattern results" -Level INFO
                $result.metadata.cache_hit = $true
                $result.metadata.end_time = (Get-Date).ToString("o")
                return $cached.cache.value
            }
        }
        
        $patternMatches = @()
        $fileCount = 0
        $lineCount = 0
        
        # Search for pattern in each file type
        foreach ($type in $FileTypes) {
            $files = Get-ChildItem -Path $RootPath -Filter $type -Recurse -File
            
            foreach ($file in $files) {
                $content = Get-Content $file.FullName
                $matchFound = $false
                
                for ($i = 0; $i -lt $content.Count; $i++) {
                    $line = $content[$i]
                    if ($line -match $Pattern) {
                        # Store regex matches in a new variable
                        $regexMatches = $Matches.Clone()
                        
                        # Capture match groups
                        $matchGroups = @()
                        foreach ($key in $regexMatches.Keys) {
                            if ($key -ne 0) {
                                $matchGroups += @{
                                    name = $key
                                    value = $regexMatches[$key]
                                }
                            }
                        }

                        $patternMatches += @{
                            file = $file.FullName
                            line = $i + 1
                            content = $line.Trim()
                            context = @{
                                before = if ($i -gt 0) { $content[$i-1].Trim() } else { $null }
                                after = if ($i -lt $content.Count - 1) { $content[$i+1].Trim() } else { $null }
                            }
                            match_groups = $matchGroups
                        }
                        $lineCount++
                        $matchFound = $true
                    }
                }
                
                if ($matchFound) {
                    $fileCount++
                }
            }
        }
        
        # Update result with matches and statistics
        $result.pattern.matches = $patternMatches
        $result.pattern.statistics = @{
            total_matches = $lineCount
            file_count = $fileCount
            line_count = $lineCount
        }
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = $fileCount
            memory_used_mb = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
        }
        
        # Cache results if requested
        if ($UseCache) {
            $cacheValue = @{
                pattern_id = $PatternId
                timestamp = Get-Date -Format "o"
                matches = $patternMatches
                statistics = $result.pattern.statistics
            }
            Set-CacheValue -Key $cacheKey -Value $cacheValue -TimeToLive 3600
        }
        
        # Update result with timing information and cleanup
        $result.metadata.end_time = (Get-Date).ToString("o")
        
        # Clean up error log if it exists
        if (Test-Path $errorLogPath) {
            Remove-Item $errorLogPath -Force
        }
        
        Write-StructuredLog -Message "Pattern search completed" -Level INFO -Properties @{
            pattern_id = $PatternId
            matches = $lineCount
            files = $fileCount
            duration_ms = $result.metrics.duration_ms
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to find code pattern: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        $result.metadata.end_time = (Get-Date).ToString("o")
        return $result
    }
}

function Get-PatternStatistics {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string[]]$PatternIds,
        [Parameter()]
        [switch]$UseCache
    )
    
    try {
        Write-StructuredLog -Message "Getting pattern statistics" -Level INFO
        $startTime = Get-Date
        
        $result = New-PatternResult -Operation "stats" -PatternId "*"
        
        $stats = @{
            total_patterns = 0
            total_matches = 0
            total_files = 0
            total_lines = 0
            patterns = @{}
        }
        
        # Get statistics for each pattern
        $patterns = if ($PatternIds) { $PatternIds } else {
            Get-CacheValue -Key "pattern_*" | ForEach-Object {
                if ($_.cache.value) {
                    $_.cache.value.metadata.pattern_id
                }
            }
        }
        
        foreach ($patternId in $patterns) {
            $patternResult = if ($UseCache) {
                Get-CacheValue -Key "pattern_$patternId"
            } else {
                Find-CodePattern -PatternId $patternId -Pattern $script:Config.Patterns.$patternId
            }
            
            if ($patternResult.status.success) {
                $stats.patterns[$patternId] = $patternResult.pattern.statistics
                $stats.total_matches += $patternResult.pattern.statistics.total_matches
                $stats.total_files += $patternResult.pattern.statistics.file_count
                $stats.total_lines += $patternResult.pattern.statistics.line_count
                $stats.total_patterns++
            }
        }
        
        # Update result
        $result.pattern = @{
            statistics = $stats
        }
        
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = $stats.total_patterns
            memory_used_mb = 0
        }
        
        Write-StructuredLog -Message "Pattern statistics retrieved" -Level INFO -Properties @{
            total_patterns = $stats.total_patterns
            total_matches = $stats.total_matches
            total_files = $stats.total_files
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to get pattern statistics: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function New-BackendPatternResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Language,
        [string]$Category
    )
    
    return @{
        metadata = @{
            language = $Language
            category = $Category
            timestamp = Get-Date -Format "o"
        }
        patterns = @{
            matched = @()
            suggested = @()
            statistics = @{
                total = 0
                byCategory = @{}
            }
        }
        status = @{
            success = $true
            warnings = @()
            errors = @()
        }
    }
}

function Get-BackendPatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$Language,
        [Parameter(Mandatory)]
        [string]$Category
    )
    
    try {
        Write-StructuredLog -Message "Analyzing backend patterns for $Language in category $Category" -Level INFO
        $result = New-BackendPatternResult -Language $Language -Category $Category
        
        # Get patterns for specified category
        $categoryPatterns = $script:BackendPatterns[$Category].Patterns |
            Where-Object { $_.Language -eq $Language }
        
        if (-not $categoryPatterns) {
            $result.status.warnings += "No patterns found for category '$Category' and language '$Language'"
            return $result
        }
        
        # Analyze content for patterns
        foreach ($pattern in $categoryPatterns) {
            $patternMatches = @()
            foreach ($signature in $pattern.Signatures) {
                if ($Content -match $signature) {
                    $regexMatches = $Matches.Clone()
                    $patternMatches += @{
                        signature = $signature
                        line = $regexMatches[0]
                    }
                }
            }
            
            if ($patternMatches) {
                $result.patterns.matched += @{
                    name = $pattern.Name
                    matches = $patternMatches
                    category = $Category
                }
            }
        }
        
        # Get suggestions if no matches found
        if (-not $result.patterns.matched) {
            $result.patterns.suggested = Get-PatternSuggestions -Pattern $categoryPatterns -Category $Category
        }
        
        # Update statistics
        $result.patterns.statistics.total = $result.patterns.matched.Count
        $result.patterns.statistics.byCategory[$Category] = $result.patterns.matched.Count
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze backend patterns: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-PatternSuggestions {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object[]]$Pattern,
        [Parameter(Mandatory)]
        [string]$Category
    )
    
    try {
        $suggestions = @()
        
        # Get top patterns from config
        $topPatterns = $script:Config.patterns.suggestions.$Category
        if (-not $topPatterns) {
            return $suggestions
        }
        
        foreach ($pattern in $Pattern) {
            if ($topPatterns.ContainsKey($pattern.Name)) {
                $suggestions += @{
                    name = $pattern.Name
                    category = $Category
                    popularity = $topPatterns[$pattern.Name].popularity
                    description = $topPatterns[$pattern.Name].description
                    documentation = $topPatterns[$pattern.Name].documentation
                }
            }
        }
        
        # Sort by popularity
        $suggestions = $suggestions | Sort-Object -Property popularity -Descending
        
        return $suggestions
    }
    catch {
        Write-StructuredLog -Message "Failed to get pattern suggestions: $_" -Level WARNING
        return @()
    }
}

function Get-ContextualizedBackendAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$Language
    )
    
    $analysis = @{
        Patterns = @{}
        OverallConfidence = 0.0
        Suggestions = @()
        Dependencies = @()
    }
    
    # Analyze each category
    foreach ($category in $script:BackendPatterns.Keys) {
        $results = Get-BackendPatterns -Content $Content -Language $Language -Category $category
        if ($results.patterns.matched.Count -gt 0) {
            $analysis.Patterns[$category] = $results.patterns.matched
            $analysis.Suggestions += $results.patterns.suggested
        }
    }
    
    # Extract dependencies
    if ($Language -eq 'go') {
        $analysis.Dependencies = Get-GoDependencies -Content $Content
    }
    
    # Calculate overall confidence
    $confidences = $analysis.Patterns.Values | 
        ForEach-Object { $_.Confidence } | 
        Where-Object { $_ -gt 0 }
    
    if ($confidences.Count -gt 0) {
        $analysis.OverallConfidence = ($confidences | Measure-Object -Property Confidence -Average).Average
    }
    
    return $analysis
}

function Get-GoDependencies {
    param([string]$Content)
    
    $dependencies = @()
    $importRegex = 'import\s*\(((?:[^()]*|\((?:[^()]*|\([^()]*\))*)*)\)'
    
    if ($Content -match $importRegex) {
        $imports = $matches[1]
        $imports -split '\r?\n' | ForEach-Object {
            if ($_ -match '"([^"]+)"') {
                $dependencies += $matches[1]
            }
        }
    }
    
    return $dependencies
}

Export-ModuleMember -Function Find-CodePattern, Get-PatternStatistics, Get-BackendPatterns, Get-ContextualizedBackendAnalysis
