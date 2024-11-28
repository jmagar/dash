using namespace System.Management.Automation.Language
using namespace System.Diagnostics

# Helper functions for testing
function New-TestReport {
    param(
        [string]$TestName,
        [hashtable]$Results,
        [TimeSpan]$Duration,
        [string]$OutputPath = "$PSScriptRoot/TestReports"
    )

    $report = @{
        TestName = $TestName
        Timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
        Duration = $Duration.TotalSeconds
        Results = $Results
        MemoryUsed = [System.GC]::GetTotalMemory($true)
    }

    # Ensure directory exists
    if (-not (Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    }

    # Save JSON report
    $jsonPath = Join-Path $OutputPath "$TestName-$(Get-Date -Format 'yyyyMMddHHmmss').json"
    $report | ConvertTo-Json -Depth 10 | Set-Content $jsonPath

    # Generate HTML report
    $htmlPath = $jsonPath -replace '\.json$', '.html'
    $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Test Report: $TestName</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .failure { color: red; }
        .metric { background: #f0f0f0; padding: 10px; margin: 5px 0; }
        pre { background: #f8f8f8; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Test Report: $TestName</h1>
    <div class="metric">Duration: $($Duration.TotalSeconds) seconds</div>
    <div class="metric">Memory Used: $([math]::Round($report.MemoryUsed / 1MB, 2)) MB</div>
    <h2>Results</h2>
    <pre>$(($Results | ConvertTo-Json -Depth 10))</pre>
</body>
</html>
"@
    $htmlContent | Set-Content $htmlPath

    return $report
}

function Measure-CodeAnalysis {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [object]$Context
    )

    $sw = [Stopwatch]::StartNew()
    $analysis = Get-ContextualizedAnalysis -Context $Context -FilePath $FilePath
    $sw.Stop()

    return @{
        Analysis = $analysis
        Duration = $sw.Elapsed
        MemoryUsed = [System.GC]::GetTotalMemory($true)
    }
}

function New-MockDatabase {
    return @{
        Connect = { param($connectionString) $true }
        Query = { param($query) 
            @(
                @{ id = 1; name = "Test1" },
                @{ id = 2; name = "Test2" }
            )
        }
        Disconnect = { $true }
    }
}

function Get-TestFiles {
    param(
        [string]$Category,
        [string]$OutputPath = "$PSScriptRoot/TestFiles"
    )

    if (-not (Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    }

    switch ($Category) {
        'Empty' {
            Set-Content -Path "$OutputPath/empty.tsx" -Value ""
            Set-Content -Path "$OutputPath/empty.go" -Value ""
        }
        'Malformed' {
            Set-Content -Path "$OutputPath/malformed.tsx" -Value @'
import React from 'react'
const Component = { => {
    const [state setState] = useState()
    return <div>
'@
            Set-Content -Path "$OutputPath/malformed.go" -Value @'
package main
func main() {
    if x := 1; x < 2 
        fmt.Println("Missing brace and parenthesis"
'@
        }
        'Mixed' {
            Set-Content -Path "$OutputPath/mixed.tsx" -Value @'
// @ts-nocheck
import React from 'react';
const Component = () => {
    // Embedded Go-like code in comments
    /*
    func process() {
        if err := db.Query("SELECT * FROM users"); err != nil {
            return err
        }
    }
    */
    return <div>Mixed Content</div>;
}
'@
        }
        'Complex' {
            # Generate a complex TypeScript file with multiple patterns
            Set-Content -Path "$OutputPath/complex.tsx" -Value (Get-ComplexTypeScriptExample)
            # Generate a complex Go file with multiple patterns
            Set-Content -Path "$OutputPath/complex.go" -Value (Get-ComplexGoExample)
        }
        'Large' {
            # Generate large files with repeated patterns
            Set-Content -Path "$OutputPath/large.tsx" -Value (Get-LargeTypeScriptExample)
            Set-Content -Path "$OutputPath/large.go" -Value (Get-LargeGoExample)
        }
    }

    return $OutputPath
}

function Get-ComplexTypeScriptExample {
    return @'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useSelector, useDispatch } from 'react-redux';
import { debounce } from 'lodash';
import axios from 'axios';

// Complex component with multiple patterns
const UserDashboard: React.FC = () => {
    // State management patterns
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const cache = useRef(new Map());
    const dispatch = useDispatch();
    
    // Performance patterns
    const debouncedSearch = useMemo(
        () => debounce((term: string) => {
            dispatch({ type: 'SEARCH', payload: term });
        }, 300),
        [dispatch]
    );

    // API patterns
    const { data: graphqlData } = useQuery(GET_USERS);
    const [updateUser] = useMutation(UPDATE_USER);

    const fetchUsers = useCallback(async () => {
        try {
            const [restResponse, graphqlResponse] = await Promise.all([
                axios.get('/api/users'),
                graphqlData
            ]);
            
            // Security pattern - data sanitization
            const sanitizedData = sanitizeUserData([
                ...restResponse.data,
                ...graphqlResponse.users
            ]);
            
            setUsers(sanitizedData);
            
            // Performance pattern - caching
            cache.current.set('users', sanitizedData);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    }, [graphqlData]);

    // Error boundary pattern
    class ErrorBoundary extends React.Component {
        componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
            console.error('Error:', error, errorInfo);
        }
    }

    return (
        <ErrorBoundary>
            <div>
                {/* Performance pattern - lazy loading */}
                <React.Suspense fallback={<div>Loading...</div>}>
                    <UserList users={users} />
                </React.Suspense>
            </div>
        </ErrorBoundary>
    );
};

export default React.memo(UserDashboard);
'@
}

function Get-ComplexGoExample {
    return @'
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"

    "github.com/go-redis/redis/v8"
    "github.com/gorilla/mux"
    "go.mongodb.org/mongo-driver/mongo"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/streadway/amqp"
    "go.opentelemetry.io/otel"
)

// Architectural pattern - Repository
type UserRepository interface {
    FindAll(ctx context.Context) ([]User, error)
    FindByID(ctx context.Context, id string) (*User, error)
    Save(ctx context.Context, user *User) error
}

// Database pattern - Multiple database support
type UserService struct {
    sqlDB    *sql.DB
    mongoDB  *mongo.Database
    cache    *redis.Client
    metrics  *prometheus.CounterVec
    producer *amqp.Channel
}

// Security pattern - Rate limiting
var limiter = rate.NewLimiter(rate.Every(time.Second), 100)

func main() {
    // Monitoring pattern - OpenTelemetry
    tp := initTracer()
    defer tp.Shutdown(context.Background())

    // Message queue pattern - RabbitMQ
    conn, err := amqp.Dial(os.Getenv("RABBITMQ_URL"))
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // Caching pattern - Redis
    rdb := redis.NewClient(&redis.Options{
        Addr: os.Getenv("REDIS_ADDR"),
    })
    defer rdb.Close()

    // API pattern - RESTful with middleware
    r := mux.NewRouter()
    r.Use(authMiddleware)
    r.Use(loggingMiddleware)
    r.Use(prometheusMiddleware)

    // Error handling pattern - Panic recovery
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Recovered from panic: %v", r)
        }
    }()

    log.Fatal(http.ListenAndServe(":8080", r))
}

// Performance pattern - Connection pooling
func initDB() (*sql.DB, error) {
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        return nil, err
    }
    
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(25)
    db.SetConnMaxLifetime(5 * time.Minute)
    
    return db, nil
}

// Security pattern - Authentication middleware
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if !validateToken(token) {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}
'@
}

function Get-LargeTypeScriptExample {
    param (
        [int]$NumberOfComponents = 100
    )

    $components = @()
    for ($i = 1; $i -le $NumberOfComponents; $i++) {
        $components += @"
const Component${i} = () => {
    const [state, setState] = useState(0);
    return (
        <div>
            <h1>Component ${i}</h1>
            <button onClick={() => setState(state + 1)}>
                Count: {state}
            </button>
        </div>
    );
};
"@
    }

    $components -join "`n"
}

function Get-LargeGoExample {
    param (
        [int]$NumberOfServices = 100
    )

    $services = @()
    for ($i = 1; $i -le $NumberOfServices; $i++) {
        $services += @"
type Service${i} struct {
    client *http.Client
    logger *log.Logger
}

func NewService${i}() *Service${i} {
    return &Service${i}{
        client: &http.Client{},
        logger: log.New(os.Stdout, "Service${i}: ", log.LstdFlags),
    }
}

func (s *Service${i}) Process(ctx context.Context, data []byte) error {
    if err := validateData(data); err != nil {
        s.logger.Printf("Error in Service${i} validating data: %v", err)
        return err
    }
    return nil
}
"@
    }

    $services -join "`n"
}
