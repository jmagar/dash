using namespace System.Collections.Concurrent

# Import configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

# Performance monitoring and optimization functions
$script:PerformanceConfig = @{
    MemoryThreshold = $script:Config.resourceManagement.memoryThreshold
    CpuThreshold = 80
    BatchSize = $script:Config.resourceManagement.batchSize
    MaxParallelism = $script:Config.resourceManagement.maxParallelism
}

function Get-SystemResources {
    [CmdletBinding()]
    param()
    
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
        
        return @{
            MemoryAvailable = [long]$os.FreePhysicalMemory * 1KB
            CpuUsage = $cpu.Average
            ProcessMemory = (Get-Process -Id $PID).WorkingSet64
        }
    }
    catch {
        Write-Warning "Failed to get system resources: $_"
        return $null
    }
}

function Test-ResourceAvailability {
    [CmdletBinding()]
    param()
    
    $resources = Get-SystemResources
    if (-not $resources) { return $true }  # Continue if we can't get resources
    
    return ($resources.MemoryAvailable -gt $script:PerformanceConfig.MemoryThreshold) -and
           ($resources.CpuUsage -lt $script:PerformanceConfig.CpuThreshold)
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
        $resources = Get-SystemResources
        if (-not $resources) { return $DefaultBatchSize }
        
        # Calculate batch size based on available memory
        $memoryRatio = $resources.MemoryAvailable / $script:PerformanceConfig.MemoryThreshold
        $cpuRatio = ($script:PerformanceConfig.CpuThreshold - $resources.CpuUsage) / $script:PerformanceConfig.CpuThreshold
        
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
        
        Write-Verbose "Optimal batch size calculated: $optimalSize (Memory: $([Math]::Round($memoryRatio, 2)), CPU: $([Math]::Round($cpuRatio, 2)))"
        return $optimalSize
    }
    catch {
        Write-Warning "Failed to calculate optimal batch size: $_"
        return $DefaultBatchSize
    }
}

function Get-OptimalParallelism {
    [CmdletBinding()]
    param()
    
    $resources = Get-SystemResources
    if (-not $resources) { return $script:PerformanceConfig.MaxParallelism }
    
    # Adjust parallelism based on CPU usage and available cores
    $cpuCount = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
    $cpuFactor = [Math]::Min(1, (100 - $resources.CpuUsage) / 100)
    
    return [Math]::Max(
        1,  # Minimum parallelism
        [Math]::Min(
            $script:PerformanceConfig.MaxParallelism,
            [int]($cpuCount * $cpuFactor)
        )
    )
}

function Start-ResourceMonitoring {
    [CmdletBinding()]
    param(
        [Parameter()]
        [int]$IntervalSeconds = 5,
        
        [Parameter()]
        [scriptblock]$ThresholdExceededAction
    )
    
    $job = Start-Job -ScriptBlock {
        param($interval, $threshold)
        
        while ($true) {
            $resources = Get-SystemResources
            if ($resources) {
                if (($resources.MemoryAvailable -lt $threshold.MemoryThreshold) -or
                    ($resources.CpuUsage -gt $threshold.CpuThreshold)) {
                    Write-Warning "Resource threshold exceeded"
                    return @{
                        Exceeded = $true
                        Resources = $resources
                    }
                }
            }
            Start-Sleep -Seconds $interval
        }
    } -ArgumentList $IntervalSeconds, $script:PerformanceConfig
    
    return $job
}

function Stop-ResourceMonitoring {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        $Job
    )
    
    if ($Job.State -eq 'Running') {
        Stop-Job -Job $Job
    }
    Remove-Job -Job $Job
}

function Invoke-LargeDirectoryProcessing {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [Parameter(Mandatory)]
        [scriptblock]$ProcessBlock,
        [string[]]$Include = @('*'),
        [int]$BatchSize = (Get-OptimalBatchSize -TotalItems (Get-ChildItem -Path $Path -Recurse).Count),
        [int]$MaxParallelism = (Get-OptimalParallelism)
    )
    
    try {
        # Use .NET methods for better performance
        $files = [System.IO.Directory]::EnumerateFiles(
            $Path,
            "*.*",
            [System.IO.SearchOption]::AllDirectories
        )
        
        # Filter files based on include patterns
        $filteredFiles = $files | Where-Object {
            $file = $_
            $Include | Where-Object { $file -like $_ }
        }
        
        # Create thread-safe dictionary for results
        $results = [ConcurrentDictionary[string,object]]::new()
        $processedCount = 0
        $totalFiles = @($filteredFiles).Count
        
        # Process files in batches
        $filteredFiles | ForEach-Object -ThrottleLimit $MaxParallelism -Parallel {
            try {
                # Get shared variables from parent scope
                $processBlock = $using:ProcessBlock
                $results = $using:results
                
                # Process the file
                $result = & $processBlock $_
                if ($result) {
                    $null = $results.TryAdd($_, $result)
                }
                
                # Update progress
                $processed = [System.Threading.Interlocked]::Increment([ref]$using:processedCount)
                $total = $using:totalFiles
                Write-Progress -Activity "Processing files" -Status "$processed of $total" `
                    -PercentComplete (($processed / $total) * 100)
            }
            catch {
                Write-Error "Error processing file $_`: $($_.Exception.Message)"
            }
        }
        
        Write-Progress -Activity "Processing files" -Completed
        return $results
    }
    catch {
        Write-ErrorLog $_
        throw
    }
}

function Measure-ProcessingTime {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [scriptblock]$ScriptBlock,
        [string]$Operation
    )
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        & $ScriptBlock
    }
    finally {
        $sw.Stop()
        Write-StructuredLog -Message "$Operation completed" -Level INFO -Properties @{
            durationMs = $sw.ElapsedMilliseconds
            operation = $Operation
        }
    }
}

Export-ModuleMember -Function @(
    'Test-ResourceAvailability',
    'Get-OptimalBatchSize',
    'Get-OptimalParallelism',
    'Start-ResourceMonitoring',
    'Stop-ResourceMonitoring',
    'Invoke-LargeDirectoryProcessing',
    'Measure-ProcessingTime'
)
