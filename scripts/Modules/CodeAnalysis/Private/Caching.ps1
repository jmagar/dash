using namespace System.Collections.Concurrent
using namespace System.Threading
using namespace System.IO

# Import configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

# Cache configuration
$script:CacheConfig = @{
    MaxItems = 10000
    DefaultTTL = [TimeSpan]::FromHours(1)
    CleanupInterval = [TimeSpan]::FromMinutes(5)
    MaxMemoryUsage = 512MB # 512 MB max cache size
}

# Initialize thread-safe caches
$script:FileCache = [ConcurrentDictionary[string, object]]::new()
$script:MetricsCache = [ConcurrentDictionary[string, object]]::new()
$script:PatternCache = [ConcurrentDictionary[string, object]]::new()

# Cache item wrapper
class CacheItem {
    [object]$Value
    [datetime]$ExpiresAt
    [long]$Size
    
    CacheItem([object]$value, [TimeSpan]$ttl, [long]$size) {
        $this.Value = $value
        $this.ExpiresAt = (Get-Date).Add($ttl)
        $this.Size = $size
    }
    
    [bool]IsExpired() {
        return (Get-Date) -gt $this.ExpiresAt
    }
}

# Start background cleanup job
$script:CleanupJob = Start-Job -ScriptBlock {
    param($CacheConfig)
    
    while ($true) {
        Start-Sleep -Seconds $CacheConfig.CleanupInterval.TotalSeconds
        
        # Cleanup expired items
        foreach ($cache in @($FileCache, $MetricsCache, $PatternCache)) {
            foreach ($key in $cache.Keys) {
                $item = $cache[$key]
                if ($item.IsExpired()) {
                    $cache.TryRemove($key, [ref]$null)
                }
            }
        }
        
        # Check memory usage
        $totalSize = ($FileCache.Values + $MetricsCache.Values + $PatternCache.Values | 
            Measure-Object -Property Size -Sum).Sum
        
        if ($totalSize -gt $CacheConfig.MaxMemoryUsage) {
            # Remove oldest items until under limit
            $items = $FileCache.Values + $MetricsCache.Values + $PatternCache.Values |
                Sort-Object ExpiresAt
            
            foreach ($item in $items) {
                if ($totalSize -le $CacheConfig.MaxMemoryUsage) { break }
                $key = $FileCache.Keys.Where({ $FileCache[$_] -eq $item })[0]
                if ($key) {
                    $FileCache.TryRemove($key, [ref]$null)
                    $totalSize -= $item.Size
                }
            }
        }
    }
} -ArgumentList $script:CacheConfig

function Add-ToCache {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateSet('File', 'Metrics', 'Pattern')]
        [string]$CacheType,
        
        [Parameter(Mandatory)]
        [string]$Key,
        
        [Parameter(Mandatory)]
        [object]$Value,
        
        [Parameter()]
        [TimeSpan]$TTL = $script:CacheConfig.DefaultTTL
    )
    
    try {
        # Calculate size of value
        $size = 0
        if ($Value -is [string]) {
            $size = [System.Text.Encoding]::UTF8.GetByteCount($Value)
        }
        elseif ($Value -is [byte[]]) {
            $size = $Value.Length
        }
        else {
            $size = [System.Text.Encoding]::UTF8.GetByteCount(($Value | ConvertTo-Json -Compress))
        }
        
        $item = [CacheItem]::new($Value, $TTL, $size)
        
        switch ($CacheType) {
            'File' { $script:FileCache[$Key] = $item }
            'Metrics' { $script:MetricsCache[$Key] = $item }
            'Pattern' { $script:PatternCache[$Key] = $item }
        }
        
        Write-StructuredLog -Message "Added item to $CacheType cache" -Level INFO -Properties @{
            key = $Key
            size = $size
            ttl = $TTL.TotalSeconds
        }
        
        return $true
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        return $false
    }
}

function Get-FromCache {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateSet('File', 'Metrics', 'Pattern')]
        [string]$CacheType,
        
        [Parameter(Mandatory)]
        [string]$Key
    )
    
    try {
        $cache = switch ($CacheType) {
            'File' { $script:FileCache }
            'Metrics' { $script:MetricsCache }
            'Pattern' { $script:PatternCache }
        }
        
        if ($cache.ContainsKey($Key)) {
            $item = $cache[$Key]
            if (-not $item.IsExpired()) {
                Write-StructuredLog -Message "Cache hit for $CacheType" -Level DEBUG -Properties @{
                    key = $Key
                }
                return $item.Value
            }
            else {
                $cache.TryRemove($Key, [ref]$null)
            }
        }
        
        Write-StructuredLog -Message "Cache miss for $CacheType" -Level DEBUG -Properties @{
            key = $Key
        }
        return $null
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        return $null
    }
}

function Clear-Cache {
    [CmdletBinding()]
    param(
        [Parameter()]
        [ValidateSet('File', 'Metrics', 'Pattern')]
        [string[]]$CacheTypes = @('File', 'Metrics', 'Pattern')
    )
    
    try {
        foreach ($type in $CacheTypes) {
            switch ($type) {
                'File' { $script:FileCache.Clear() }
                'Metrics' { $script:MetricsCache.Clear() }
                'Pattern' { $script:PatternCache.Clear() }
            }
            
            Write-StructuredLog -Message "Cleared $type cache" -Level INFO
        }
        return $true
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        return $false
    }
}

# Cleanup on module unload
$ExecutionContext.SessionState.Module.OnRemove = {
    Stop-Job -Job $script:CleanupJob
    Remove-Job -Job $script:CleanupJob
}

Export-ModuleMember -Function Add-ToCache, Get-FromCache, Clear-Cache
