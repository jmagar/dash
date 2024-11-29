# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

function Start-ResourceMonitoring {
    [CmdletBinding()]
    param()
    
    try {
        Write-Verbose "Starting resource monitoring"
        
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        # Start background job for monitoring
        $job = Start-Job -ScriptBlock {
            param($config)
            
            while ($true) {
                # Get current process
                $process = Get-Process -Id $PID
                
                # Get memory usage in MB
                $memoryUsage = [math]::Round($process.WorkingSet64 / 1MB, 2)
                
                # Get CPU usage
                $cpuUsage = [math]::Round($process.CPU, 2)
                
                # Check thresholds
                if ($memoryUsage -gt $config.resourceManagement.memoryThreshold) {
                    Write-Warning "Memory usage exceeded threshold: $memoryUsage MB"
                }
                
                if ($cpuUsage -gt $config.resourceManagement.cpuThreshold) {
                    Write-Warning "CPU usage exceeded threshold: $cpuUsage%"
                }
                
                # Wait for next interval
                Start-Sleep -Seconds $config.resourceManagement.monitoringInterval
            }
        } -ArgumentList $config.config
        
        return $job
    }
    catch {
        Write-Error "Failed to start resource monitoring: $_"
        return $null
    }
}

Export-ModuleMember -Function Start-ResourceMonitoring
