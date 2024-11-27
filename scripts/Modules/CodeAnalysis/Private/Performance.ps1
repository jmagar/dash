using namespace System.Collections.Concurrent

# Import configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/metrics.json" | ConvertFrom-Json

function Invoke-LargeDirectoryProcessing {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [Parameter(Mandatory)]
        [scriptblock]$ProcessBlock,
        [string[]]$Include = @('*'),
        [int]$BatchSize = $script:Config.performance.batchSize,
        [int]$MaxParallelism = $script:Config.performance.maxParallelism
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

Export-ModuleMember -Function Invoke-LargeDirectoryProcessing, Measure-ProcessingTime
