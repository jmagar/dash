using namespace System.Management.Automation.Language

# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

function New-VisualizationResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$VisualizationId,
        [Parameter()]
        [hashtable]$Properties = @{}
    )
    
    return @{
        metadata = @{
            operation = $Operation
            visualization_id = $VisualizationId
            timestamp = Get-Date -Format "o"
            version = "1.0"
            session_id = $script:Config.SessionId
        }
        visualization = @{
            properties = $Properties
            type = $null
            data = $null
            format = $null
            path = $null
        }
        metrics = @{
            duration_ms = 0
            items_processed = 0
            memory_used_mb = 0
            file_size_bytes = 0
        }
        status = @{
            success = $true
            warnings = @()
            errors = @()
        }
    }
}

function Export-DependencyGraph {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$VisualizationId,
        [Parameter(Mandatory)]
        [hashtable]$Dependencies,
        [Parameter()]
        [string]$OutputPath = "$PWD/visualizations",
        [Parameter()]
        [ValidateSet('svg', 'png', 'pdf')]
        [string]$Format = 'svg'
    )
    
    try {
        Write-StructuredLog -Message "Exporting dependency graph" -Level INFO
        $startTime = Get-Date
        $errorLogPath = Join-Path $OutputPath "$VisualizationId.error.log"
        
        $result = New-VisualizationResult -Operation "export_graph" -VisualizationId $VisualizationId
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Ensure output directory exists
        if (-not (Test-Path $OutputPath)) {
            New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        }
        
        # Create DOT file content
        $dotContent = @"
digraph DependencyGraph {
    rankdir=LR;
    node [shape=box, style=rounded];
    edge [color="#666666"];

"@
        
        # Add nodes and edges
        $nodes = @{}
        foreach ($module in $Dependencies.Keys) {
            if (-not $nodes.ContainsKey($module)) {
                $nodes[$module] = $true
                $dotContent += "    `"$module`" [label=`"$module`"]`n"
            }
            
            foreach ($dep in $Dependencies[$module]) {
                if (-not $nodes.ContainsKey($dep)) {
                    $nodes[$dep] = $true
                    $dotContent += "    `"$dep`" [label=`"$dep`"]`n"
                }
                $dotContent += "    `"$module`" -> `"$dep`"`n"
            }
        }
        
        $dotContent += "}`n"
        
        # Save DOT file
        $dotFile = Join-Path $OutputPath "$VisualizationId.dot"
        $outputFile = Join-Path $OutputPath "$VisualizationId.$Format"
        
        Set-Content -Path $dotFile -Value $dotContent
        
        # Generate visualization using Graphviz
        $graphvizArgs = @(
            "-T$Format"
            "-o$outputFile"
            $dotFile
        )
        
        # Run Graphviz with error redirection
        $graphvizResult = dot @graphvizArgs 2>$errorLogPath
        if ($LASTEXITCODE -ne 0) {
            $errorContent = Get-Content $errorLogPath -Raw
            throw "Graphviz failed with exit code $LASTEXITCODE. Error: $errorContent"
        }
        
        # Clean up error log if successful
        if (Test-Path $errorLogPath) {
            Remove-Item $errorLogPath
        }
        
        # Get file size
        $fileSize = (Get-Item $outputFile).Length
        
        # Update result
        $result.visualization = @{
            type = "dependency_graph"
            format = $Format
            path = $outputFile
            data = @{
                nodes = $nodes.Keys
                edges = $Dependencies
            }
        }
        
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = $nodes.Count
            memory_used_mb = 0
            file_size_bytes = $fileSize
        }
        
        # Update result with timing information
        $result.metadata.end_time = (Get-Date).ToString("o")
        
        # Clean up error log if it exists
        if (Test-Path $errorLogPath) {
            Remove-Item $errorLogPath
        }
        
        Write-StructuredLog -Message "Dependency graph exported" -Level INFO -Properties @{
            visualization_id = $VisualizationId
            format = $Format
            nodes = $nodes.Count
            file_size = $fileSize
            duration_ms = $result.metrics.duration_ms
        }
        
        # Store command results in visualization metadata
        $result.visualization.metadata = @{
            graphviz_output = $graphvizResult
            start_time = $startTime.ToString("o")
            end_time = (Get-Date).ToString("o")
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to export dependency graph: $_" -Level ERROR
        if (Test-Path $errorLogPath) {
            $errorContent = Get-Content $errorLogPath -Raw
            Write-StructuredLog -Message "Error details: $errorContent" -Level ERROR
            Remove-Item $errorLogPath
        }
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        $result.metadata.end_time = (Get-Date).ToString("o")
        return $result
    }
}

function Export-MetricsVisualization {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$VisualizationId,
        [Parameter(Mandatory)]
        [hashtable]$Metrics,
        [Parameter()]
        [string]$OutputPath = "$PWD/visualizations",
        [Parameter()]
        [ValidateSet('svg', 'png', 'pdf')]
        [string]$Format = 'svg'
    )
    
    try {
        Write-StructuredLog -Message "Exporting metrics visualization" -Level INFO
        $startTime = Get-Date
        $errorLogPath = Join-Path $OutputPath "$VisualizationId.error.log"
        
        $result = New-VisualizationResult -Operation "export_metrics" -VisualizationId $VisualizationId
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Ensure output directory exists
        if (-not (Test-Path $OutputPath)) {
            New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        }
        
        # Create HTML content with embedded Chart.js
        $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Code Analysis Metrics</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <canvas id="metricsChart"></canvas>
    <script>
        const ctx = document.getElementById('metricsChart');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: $(ConvertTo-Json @($Metrics.Keys)),
                datasets: [{
                    label: 'Code Metrics',
                    data: $(ConvertTo-Json @($Metrics.Values)),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>
"@
        
        # Save HTML file
        $htmlFile = Join-Path $OutputPath "$VisualizationId.html"
        Set-Content -Path $htmlFile -Value $htmlContent
        
        # Convert to requested format using Chrome headless
        $outputFile = Join-Path $OutputPath "$VisualizationId.$Format"
        $chromeArgs = @(
            "--headless"
            "--disable-gpu"
            "--screenshot=$outputFile"
            "--window-size=800,600"
            $htmlFile
        )
        
        # Run Chrome with error redirection
        $errorLogPath = Join-Path $OutputPath "$VisualizationId.chrome.error.log"
        $chromeResult = & "chrome" @chromeArgs 2>$errorLogPath
        if ($LASTEXITCODE -ne 0) {
            $errorContent = Get-Content $errorLogPath -Raw
            throw "Chrome headless failed with exit code $LASTEXITCODE. Error: $errorContent"
        }
        
        # Clean up error log if successful
        if (Test-Path $errorLogPath) {
            Remove-Item $errorLogPath
        }
        
        # Get process memory usage
        $process = Get-Process -Id $PID
        $memoryUsedMB = [Math]::Round($process.WorkingSet64 / 1MB, 2)
        
        # Get file size
        $fileSize = (Get-Item $outputFile).Length
        
        # Update result with complete visualization properties
        $result.visualization = @{
            type = "metrics_chart"
            format = $Format
            path = $outputFile
            data = @{
                metrics = $Metrics
                chart_type = "bar"
                dimensions = @{
                    width = 800
                    height = 400
                }
                styling = @{
                    colors = @("#4e79a7", "#f28e2c", "#e15759")
                    font_family = "Arial, sans-serif"
                    background = "#ffffff"
                }
            }
        }
        
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = $Metrics.Count
            memory_used_mb = $memoryUsedMB
            file_size_bytes = $fileSize
        }
        
        # Update result with timing information
        $result.metadata.end_time = (Get-Date).ToString("o")
        
        # Clean up error log if it exists
        if (Test-Path $errorLogPath) {
            Remove-Item $errorLogPath
        }
        
        Write-StructuredLog -Message "Metrics visualization exported" -Level INFO -Properties @{
            visualization_id = $VisualizationId
            format = $Format
            metrics = $Metrics.Count
            file_size = $fileSize
            duration_ms = $result.metrics.duration_ms
        }
        
        # Store command results in visualization metadata
        $result.visualization.metadata = @{
            chrome_output = $chromeResult
            start_time = $startTime.ToString("o")
            end_time = (Get-Date).ToString("o")
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to export metrics visualization: $_" -Level ERROR
        if (Test-Path $errorLogPath) {
            $errorContent = Get-Content $errorLogPath -Raw
            Write-StructuredLog -Message "Error details: $errorContent" -Level ERROR
            Remove-Item $errorLogPath
        }
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        $result.metadata.end_time = (Get-Date).ToString("o")
        return $result
    }
}

function Export-PatternDistribution {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$VisualizationId,
        [Parameter(Mandatory)]
        [hashtable]$PatternStats,
        [Parameter()]
        [string]$OutputPath = "$PWD/visualizations",
        [Parameter()]
        [ValidateSet('svg', 'png', 'pdf')]
        [string]$Format = 'svg'
    )
    
    try {
        Write-StructuredLog -Message "Exporting pattern distribution" -Level INFO
        $startTime = Get-Date
        $errorLogPath = Join-Path $OutputPath "$VisualizationId.error.log"
        
        $result = New-VisualizationResult -Operation "export_patterns" -VisualizationId $VisualizationId
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Ensure output directory exists
        if (-not (Test-Path $OutputPath)) {
            New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        }
        
        # Create HTML content with embedded Chart.js
        $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Pattern Distribution</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <canvas id="patternChart"></canvas>
    <script>
        const ctx = document.getElementById('patternChart');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: $(ConvertTo-Json @($PatternStats.Keys)),
                datasets: [{
                    data: $(ConvertTo-Json @($PatternStats.Values)),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });
    </script>
</body>
</html>
"@
        
        # Save HTML file
        $htmlFile = Join-Path $OutputPath "$VisualizationId.html"
        Set-Content -Path $htmlFile -Value $htmlContent
        
        # Convert to requested format using Chrome headless
        $outputFile = Join-Path $OutputPath "$VisualizationId.$Format"
        $chromeArgs = @(
            "--headless"
            "--disable-gpu"
            "--screenshot=$outputFile"
            "--window-size=800,600"
            $htmlFile
        )
        
        # Run Chrome with error redirection
        $errorLogPath = Join-Path $OutputPath "$VisualizationId.chrome.error.log"
        $chromeResult = & "chrome" @chromeArgs 2>$errorLogPath
        if ($LASTEXITCODE -ne 0) {
            $errorContent = Get-Content $errorLogPath -Raw
            throw "Chrome headless failed with exit code $LASTEXITCODE. Error: $errorContent"
        }
        
        # Clean up error log if successful
        if (Test-Path $errorLogPath) {
            Remove-Item $errorLogPath
        }
        
        # Get process memory usage
        $process = Get-Process -Id $PID
        $memoryUsedMB = [Math]::Round($process.WorkingSet64 / 1MB, 2)
        
        # Get file size
        $fileSize = (Get-Item $outputFile).Length
        
        # Update result with complete visualization properties
        $result.visualization = @{
            type = "pattern_distribution"
            format = $Format
            path = $outputFile
            data = @{
                patterns = $PatternStats
                chart_type = "pie"
                dimensions = @{
                    width = 800
                    height = 400
                }
                styling = @{
                    colors = @("#4e79a7", "#f28e2c", "#e15759")
                    font_family = "Arial, sans-serif"
                    background = "#ffffff"
                }
            }
        }
        
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = $PatternStats.Count
            memory_used_mb = $memoryUsedMB
            file_size_bytes = $fileSize
        }
        
        # Update result with timing information
        $result.metadata.end_time = (Get-Date).ToString("o")
        
        # Clean up error log if it exists
        if (Test-Path $errorLogPath) {
            Remove-Item $errorLogPath
        }
        
        Write-StructuredLog -Message "Pattern distribution exported" -Level INFO -Properties @{
            visualization_id = $VisualizationId
            format = $Format
            patterns = $PatternStats.Count
            file_size = $fileSize
            duration_ms = $result.metrics.duration_ms
        }
        
        # Store command results in visualization metadata
        $result.visualization.metadata = @{
            chrome_output = $chromeResult
            start_time = $startTime.ToString("o")
            end_time = (Get-Date).ToString("o")
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to export pattern distribution: $_" -Level ERROR
        if (Test-Path $errorLogPath) {
            $errorContent = Get-Content $errorLogPath -Raw
            Write-StructuredLog -Message "Error details: $errorContent" -Level ERROR
            Remove-Item $errorLogPath
        }
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        $result.metadata.end_time = (Get-Date).ToString("o")
        return $result
    }
}

Export-ModuleMember -Function Export-DependencyGraph, Export-MetricsVisualization, Export-PatternDistribution
