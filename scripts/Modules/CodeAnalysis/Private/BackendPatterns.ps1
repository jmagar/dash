# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

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
    
    try {
        # Initialize logging if not already initialized
        if (-not $script:LogConfig) {
            Initialize-Logging | Out-Null
        }
        
        Write-StructuredLog -Message "Analyzing backend patterns for $Language in category $Category" -Level INFO
        
        # Initialize result object
        $backendResult = @{
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
                errors = @()
            }
        }
        
        # Get patterns for specified category
        $categoryPatterns = $script:BackendPatterns[$Category].Patterns |
            Where-Object { $_.Language -eq $Language }
        
        if (-not $categoryPatterns) {
            $backendResult.status.warnings += "No patterns found for category '$Category' and language '$Language'"
            return $backendResult
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
                $backendResult.patterns.matched += @{
                    name = $pattern.Name
                    matches = $patternMatches
                    category = $Category
                }
            }
        }
        
        # Update statistics
        $backendResult.patterns.statistics.total = $backendResult.patterns.matched.Count
        $backendResult.patterns.statistics.byCategory[$Category] = $backendResult.patterns.matched.Count
        
        Write-StructuredLog -Message "Backend pattern analysis completed" -Level INFO -Properties @{
            language = $Language
            category = $Category
            matches = $backendResult.patterns.statistics.total
        }
        
        return $backendResult
    }
    catch {
        Write-StructuredLog -Message "Failed to analyze backend patterns: $_" -Level ERROR
        return @{
            patterns = @{
                matched = @()
                suggested = @()
                statistics = @{
                    total = 0
                    byCategory = @{}
                }
            }
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

Export-ModuleMember -Function Get-BackendPatterns
