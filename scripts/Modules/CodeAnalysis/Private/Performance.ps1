using namespace System.Collections.Concurrent

# Import configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json
$script:MLConfig = Get-Content "$PSScriptRoot/../Config/ml.json" | ConvertFrom-Json

# Import logging
. $PSScriptRoot/Logging.ps1

# Performance monitoring and optimization functions
$script:PerformanceConfig = @{
    MemoryThreshold = $script:Config.resourceManagement.memoryThreshold
    CpuThreshold = 80
    BatchSize = $script:Config.resourceManagement.batchSize
    MaxParallelism = $script:Config.resourceManagement.maxParallelism
}

function New-PerformanceResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$MetricType,
        [Parameter()]
        [string]$Identifier = ""
    )
    
    return @{
        metadata = @{
            operation = $Operation
            type = $MetricType
            identifier = $Identifier
            timestamp = Get-Date -Format "o"
            version = "1.0"
        }
        metrics = @{
            duration_ms = 0
            memory_mb = 0
            cpu_percent = 0
            threads = 0
            items_processed = 0
        }
        resources = @{
            cpu = @{
                total = 0
                used = 0
                available = 0
            }
            memory = @{
                total = 0
                used = 0
                available = 0
            }
            disk = @{
                total = 0
                used = 0
                available = 0
            }
        }
        thresholds = @{
            cpu = 80
            memory = 80
            disk = 80
        }
        status = @{
            success = $true
            healthy = $true
            warnings = @()
            errors = @()
        }
    }
}

function Get-SystemResources {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Getting system resources" -Level INFO
        $startTime = Get-Date
        
        $result = New-PerformanceResult -Operation "monitor" -MetricType "system"
        
        # Get CPU metrics
        $cpu = Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue
        if ($cpu) {
            $cpuPercent = [Math]::Round($cpu.CounterSamples[0].CookedValue, 2)
            $result.resources.cpu = @{
                total = 100
                used = $cpuPercent
                available = 100 - $cpuPercent
            }
        }
        
        # Get memory metrics
        $os = Get-Ciminstance Win32_OperatingSystem
        $totalMemory = $os.TotalVisibleMemorySize * 1KB
        $freeMemory = $os.FreePhysicalMemory * 1KB
        $usedMemory = $totalMemory - $freeMemory
        
        $result.resources.memory = @{
            total = [Math]::Round($totalMemory / 1GB, 2)
            used = [Math]::Round($usedMemory / 1GB, 2)
            available = [Math]::Round($freeMemory / 1GB, 2)
        }
        
        # Get disk metrics
        $disk = Get-PSDrive C
        $result.resources.disk = @{
            total = [Math]::Round($disk.Free / 1GB + $disk.Used / 1GB, 2)
            used = [Math]::Round($disk.Used / 1GB, 2)
            available = [Math]::Round($disk.Free / 1GB, 2)
        }
        
        # Check thresholds
        $cpuUsedPercent = $result.resources.cpu.used
        $memoryUsedPercent = ($result.resources.memory.used / $result.resources.memory.total) * 100
        $diskUsedPercent = ($result.resources.disk.used / $result.resources.disk.total) * 100
        
        if ($cpuUsedPercent -gt $result.thresholds.cpu) {
            $result.status.warnings += "CPU usage above threshold: $cpuUsedPercent%"
            $result.status.healthy = $false
        }
        
        if ($memoryUsedPercent -gt $result.thresholds.memory) {
            $result.status.warnings += "Memory usage above threshold: $([Math]::Round($memoryUsedPercent, 2))%"
            $result.status.healthy = $false
        }
        
        if ($diskUsedPercent -gt $result.thresholds.disk) {
            $result.status.warnings += "Disk usage above threshold: $([Math]::Round($diskUsedPercent, 2))%"
            $result.status.healthy = $false
        }
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            memory_mb = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
            cpu_percent = $cpuUsedPercent
            threads = (Get-Process -Id $PID).Threads.Count
            items_processed = 3  # CPU, Memory, Disk
        }
        
        Write-StructuredLog -Message "System resources retrieved" -Level INFO -Properties @{
            cpu_percent = $cpuUsedPercent
            memory_percent = $memoryUsedPercent
            disk_percent = $diskUsedPercent
            healthy = $result.status.healthy
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to get system resources: $_" -Level ERROR
        $result.status.success = $false
        $result.status.healthy = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-OptimalBatchSize {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [int]$TotalItems,
        [Parameter()]
        [int]$DefaultBatchSize = $script:PerformanceConfig.BatchSize,
        [Parameter()]
        [int]$MinBatchSize = 10
    )
    
    try {
        $result = New-PerformanceResult -Operation "optimize" -MetricType "batch"
        $startTime = Get-Date
        
        # Get system resources
        $resources = Get-SystemResources
        if (-not $resources.status.healthy) {
            Write-StructuredLog -Message "Using default batch size due to resource status" -Level WARNING
            return $DefaultBatchSize
        }
        
        # Calculate ratios
        $memoryRatio = $resources.resources.memory.available / $resources.resources.memory.total
        $cpuRatio = ($resources.resources.cpu.total - $resources.resources.cpu.used) / $resources.resources.cpu.total
        
        # Use the more conservative ratio
        $ratio = [Math]::Min($memoryRatio, $cpuRatio)
        
        # Calculate optimal batch size
        $optimalSize = [Math]::Max(
            $MinBatchSize,
            [Math]::Min(
                [int]($DefaultBatchSize * $ratio),
                [int]($TotalItems / $script:PerformanceConfig.MaxParallelism)
            )
        )
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            memory_mb = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
            cpu_percent = $resources.resources.cpu.used
            threads = (Get-Process -Id $PID).Threads.Count
            items_processed = 1
        }
        
        # Add batch size to resources
        $result.resources = @{
            batch = @{
                size = $optimalSize
                total_items = $TotalItems
                parallelism = $script:PerformanceConfig.MaxParallelism
            }
        }
        
        Write-StructuredLog -Message "Optimal batch size calculated" -Level INFO -Properties @{
            total_items = $TotalItems
            optimal_size = $optimalSize
            memory_ratio = [Math]::Round($memoryRatio, 2)
            cpu_ratio = [Math]::Round($cpuRatio, 2)
        }
        
        return $optimalSize
    }
    catch {
        Write-StructuredLog -Message "Failed to calculate optimal batch size: $_" -Level ERROR
        $result.status.success = $false
        $result.status.healthy = $false
        $result.status.errors += $_.Exception.Message
        return $DefaultBatchSize
    }
}

function Get-OptimalParallelism {
    [CmdletBinding()]
    param()
    
    try {
        $result = New-PerformanceResult -Operation "optimize" -MetricType "parallelism"
        $startTime = Get-Date
        
        # Get system resources
        $resources = Get-SystemResources
        if (-not $resources.status.healthy) {
            Write-StructuredLog -Message "Using default parallelism due to resource status" -Level WARNING
            return $script:PerformanceConfig.MaxParallelism
        }
        
        # Calculate optimal parallelism
        $cpuCount = (Get-WmiObject -Class Win32_ComputerSystem).NumberOfLogicalProcessors
        $cpuFactor = [Math]::Min(1, (100 - $resources.resources.cpu.used) / 100)
        
        $optimalParallelism = [Math]::Max(
            1,  # Minimum parallelism
            [Math]::Min(
                $script:PerformanceConfig.MaxParallelism,
                [int]($cpuCount * $cpuFactor)
            )
        )
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            memory_mb = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
            cpu_percent = $resources.resources.cpu.used
            threads = (Get-Process -Id $PID).Threads.Count
            items_processed = 1
        }
        
        # Add parallelism to resources
        $result.resources = @{
            parallelism = @{
                optimal = $optimalParallelism
                max = $script:PerformanceConfig.MaxParallelism
                cpu_count = $cpuCount
                cpu_factor = [Math]::Round($cpuFactor, 2)
            }
        }
        
        Write-StructuredLog -Message "Optimal parallelism calculated" -Level INFO -Properties @{
            cpu_cores = $cpuCount
            cpu_factor = [Math]::Round($cpuFactor, 2)
            optimal_parallelism = $optimalParallelism
        }
        
        return $optimalParallelism
    }
    catch {
        Write-StructuredLog -Message "Failed to calculate optimal parallelism: $_" -Level ERROR
        $result.status.success = $false
        $result.status.healthy = $false
        $result.status.errors += $_.Exception.Message
        return $script:PerformanceConfig.MaxParallelism
    }
}

function Start-ResourceMonitoring {
    [CmdletBinding()]
    param(
        [Parameter()]
        [int]$IntervalSeconds = 5,
        [Parameter()]
        [scriptblock]$ThresholdExceededAction,
        [Parameter()]
        [int]$MaxRetries = 3
    )
    
    try {
        $result = New-PerformanceResult -Operation "monitor" -MetricType "continuous"
        $startTime = Get-Date
        
        $job = Start-Job -ScriptBlock {
            param($interval, $threshold, $maxRetries)
            
            $retryCount = 0
            while ($true) {
                try {
                    $resources = Get-SystemResources
                    if ($resources.status.healthy) {
                        if (($resources.resources.cpu.used -gt $threshold.cpu) -or
                            ($resources.resources.memory.used / $resources.resources.memory.total * 100 -gt $threshold.memory) -or
                            ($resources.resources.disk.used / $resources.resources.disk.total * 100 -gt $threshold.disk)) {
                            return @{
                                Exceeded = $true
                                Resources = $resources
                            }
                        }
                        $retryCount = 0  # Reset retry count on success
                    }
                    else {
                        $retryCount++
                        if ($retryCount -ge $maxRetries) {
                            throw "Failed to get system resources after $maxRetries attempts"
                        }
                    }
                }
                catch {
                    Write-Warning "Resource monitoring error: $_"
                    $retryCount++
                    if ($retryCount -ge $maxRetries) {
                        throw
                    }
                }
                Start-Sleep -Seconds $interval
            }
        } -ArgumentList $IntervalSeconds, $script:PerformanceConfig, $MaxRetries
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            memory_mb = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
            cpu_percent = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples[0].CookedValue
            threads = (Get-Process -Id $PID).Threads.Count
            items_processed = 1
        }
        
        Write-StructuredLog -Message "Resource monitoring started" -Level INFO -Properties @{
            interval_seconds = $IntervalSeconds
            max_retries = $MaxRetries
        }
        
        return $job
    }
    catch {
        Write-StructuredLog -Message "Failed to start resource monitoring: $_" -Level ERROR
        $result.status.success = $false
        $result.status.healthy = $false
        $result.status.errors += $_.Exception.Message
        return $null
    }
}

function Measure-ProcessingTime {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [scriptblock]$ScriptBlock,
        [Parameter()]
        [object[]]$Arguments
    )
    
    try {
        $result = New-PerformanceResult -Operation $Operation -MetricType "timing"
        $startTime = Get-Date
        
        # Execute the script block
        $output = if ($Arguments) {
            & $ScriptBlock @Arguments
        }
        else {
            & $ScriptBlock
        }
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            memory_mb = [Math]::Round((Get-Process -Id $PID).WorkingSet64 / 1MB, 2)
            cpu_percent = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples[0].CookedValue
            threads = (Get-Process -Id $PID).Threads.Count
            items_processed = 1
        }
        
        Write-StructuredLog -Message "Operation timing completed" -Level INFO -Properties @{
            operation = $Operation
            duration_ms = $result.metrics.duration_ms
        }
        
        return @{
            Result = $output
            Duration = $result.metrics.duration_ms
            Success = $true
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to measure processing time: $_" -Level ERROR
        $result.status.success = $false
        $result.status.healthy = $false
        $result.status.errors += $_.Exception.Message
        return @{
            Result = $null
            Duration = 0
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

Export-ModuleMember -Function Get-SystemResources, Get-OptimalBatchSize, Get-OptimalParallelism, Start-ResourceMonitoring, Measure-ProcessingTime
