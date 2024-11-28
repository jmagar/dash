using namespace System.Management.Automation.Language

# Import required modules
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
    
    $results = @{
        Patterns = @()
        Confidence = 0.0
        Suggestions = @()
    }
    
    try {
        # Get patterns for the specified category
        $categoryPatterns = $script:BackendPatterns[$Category].Patterns |
            Where-Object { $_.Language -eq $Language }
        
        foreach ($pattern in $categoryPatterns) {
            $matchCount = 0
            $totalSignatures = $pattern.Signatures.Count
            
            foreach ($signature in $pattern.Signatures) {
                if ($Content -match [regex]::Escape($signature)) {
                    $matchCount++
                }
            }
            
            if ($matchCount -gt 0) {
                $confidence = $matchCount / $totalSignatures
                $results.Patterns += @{
                    Name = $pattern.Name
                    Matches = $matchCount
                    Confidence = $confidence
                }
                
                # Add pattern-specific suggestions
                $results.Suggestions += Get-PatternSuggestions -Pattern $pattern.Name -Category $Category
            }
        }
        
        # Calculate overall confidence
        if ($results.Patterns.Count -gt 0) {
            $results.Confidence = ($results.Patterns | Measure-Object -Property Confidence -Average).Average
        }
        
        return $results
    }
    catch {
        Write-Error "Failed to analyze backend patterns: $_"
        return $results
    }
}

function Get-PatternSuggestions {
    param($Pattern, $Category)
    
    $suggestions = @()
    
    switch ($Category) {
        'Database' {
            $suggestions += @(
                "Ensure connection pooling is configured correctly",
                "Implement retry logic for transient failures",
                "Use prepared statements for SQL queries",
                "Consider implementing database migrations"
            )
        }
        'API' {
            $suggestions += @(
                "Implement proper error handling and status codes",
                "Add request validation middleware",
                "Configure rate limiting",
                "Add API documentation using Swagger/OpenAPI"
            )
        }
        'Authentication' {
            $suggestions += @(
                "Implement token refresh mechanism",
                "Add rate limiting for auth endpoints",
                "Use secure token storage",
                "Implement proper error handling for auth failures"
            )
        }
        'Caching' {
            $suggestions += @(
                "Implement cache invalidation strategy",
                "Add error handling for cache failures",
                "Consider using cache-aside pattern",
                "Monitor cache hit/miss rates"
            )
        }
        'MessageQueue' {
            $suggestions += @(
                "Implement dead letter queues",
                "Add retry logic for failed messages",
                "Monitor queue depth and latency",
                "Implement proper error handling"
            )
        }
        'Monitoring' {
            $suggestions += @(
                "Add custom metrics for business KPIs",
                "Configure alerting thresholds",
                "Implement distributed tracing",
                "Add logging correlation IDs"
            )
        }
    }
    
    return $suggestions
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
        if ($results.Patterns.Count -gt 0) {
            $analysis.Patterns[$category] = $results.Patterns
            $analysis.Suggestions += $results.Suggestions
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
        $analysis.OverallConfidence = ($confidences | Measure-Object -Average).Average
    }
    
    return $analysis
}

function Get-GoDependencies {
    param([string]$Content)
    
    $dependencies = @()
    $importRegex = 'import\s*\(((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*)\)'
    
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

Export-ModuleMember -Function Get-BackendPatterns, Get-ContextualizedBackendAnalysis
