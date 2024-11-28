using namespace System.Management.Automation.Language
using namespace System.Collections.Concurrent

# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json
$script:CacheStore = [ConcurrentDictionary[string, object]]::new()

function New-CacheResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$Key,
        [Parameter()]
        [hashtable]$Context = @{}
    )
    
    return @{
        metadata = @{
            operation = $Operation
            key = $Key
            timestamp = Get-Date -Format "o"
            version = "1.0"
            session_id = $script:Config.SessionId
        }
        context = $Context
        cache = @{
            value = $null
            expiration = $null
            size_bytes = 0
            hits = 0
            misses = 0
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

function Set-CacheValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Key,
        [Parameter(Mandatory)]
        [object]$Value,
        [Parameter()]
        [TimeSpan]$TimeToLive = [TimeSpan]::FromHours(1),
        [Parameter()]
        [hashtable]$Metadata = @{}
    )
    
    try {
        Write-StructuredLog -Message "Setting cache value" -Level INFO
        $startTime = Get-Date
        
        $result = New-CacheResult -Operation "set" -Key $Key
        
        # Create cache entry
        $entry = @{
            value = $Value
            metadata = $Metadata
            created = Get-Date
            expires = (Get-Date).Add($TimeToLive)
            hits = 0
        }
        
        # Store in cache
        $script:CacheStore[$Key] = $entry
        
        # Calculate size
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
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = 1
            memory_used_mb = [Math]::Round($size / 1MB, 2)
        }
        
        $result.cache = @{
            value = $Value
            expiration = $entry.expires
            size_bytes = $size
            hits = 0
            misses = 0
        }
        
        Write-StructuredLog -Message "Cache value set" -Level INFO -Properties @{
            key = $Key
            size_bytes = $size
            expiration = $entry.expires
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to set cache value: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-CacheValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Key,
        [Parameter()]
        [switch]$RemoveIfExpired
    )
    
    try {
        Write-StructuredLog -Message "Getting cache value" -Level INFO
        $startTime = Get-Date
        
        $result = New-CacheResult -Operation "get" -Key $Key
        
        if (-not $script:CacheStore.ContainsKey($Key)) {
            $result.cache.misses++
            return $result
        }
        
        $entry = $script:CacheStore[$Key]
        
        # Check expiration
        if ($entry.expires -lt (Get-Date)) {
            if ($RemoveIfExpired) {
                $null = $script:CacheStore.TryRemove($Key, [ref]$null)
            }
            $result.cache.misses++
            $result.status.warnings += "Cache entry expired"
            return $result
        }
        
        # Update hit count
        $entry.hits++
        
        # Calculate size
        $size = 0
        if ($entry.value -is [string]) {
            $size = [System.Text.Encoding]::UTF8.GetByteCount($entry.value)
        }
        elseif ($entry.value -is [byte[]]) {
            $size = $entry.value.Length
        }
        else {
            $size = [System.Text.Encoding]::UTF8.GetByteCount(($entry.value | ConvertTo-Json -Compress))
        }
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = 1
            memory_used_mb = [Math]::Round($size / 1MB, 2)
        }
        
        $result.cache = @{
            value = $entry.value
            expiration = $entry.expires
            size_bytes = $size
            hits = $entry.hits
            misses = 0
        }
        
        Write-StructuredLog -Message "Cache value retrieved" -Level INFO -Properties @{
            key = $Key
            hits = $entry.hits
            expiration = $entry.expires
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to get cache value: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Remove-CacheValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Key
    )
    
    try {
        Write-StructuredLog -Message "Removing cache value" -Level INFO
        $startTime = Get-Date
        
        $result = New-CacheResult -Operation "remove" -Key $Key
        
        if ($script:CacheStore.ContainsKey($Key)) {
            $entry = $script:CacheStore[$Key]
            $null = $script:CacheStore.TryRemove($Key, [ref]$null)
            
            # Calculate size
            $size = 0
            if ($entry.value -is [string]) {
                $size = [System.Text.Encoding]::UTF8.GetByteCount($entry.value)
            }
            elseif ($entry.value -is [byte[]]) {
                $size = $entry.value.Length
            }
            else {
                $size = [System.Text.Encoding]::UTF8.GetByteCount(($entry.value | ConvertTo-Json -Compress))
            }
            
            # Update metrics
            $result.metrics = @{
                duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
                items_processed = 1
                memory_used_mb = [Math]::Round($size / 1MB, 2)
            }
            
            $result.cache = @{
                value = $null
                expiration = $null
                size_bytes = $size
                hits = $entry.hits
                misses = 0
            }
            
            Write-StructuredLog -Message "Cache value removed" -Level INFO -Properties @{
                key = $Key
                hits = $entry.hits
                size_bytes = $size
            }
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to remove cache value: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Clear-Cache {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$Pattern,
        [Parameter()]
        [switch]$RemoveExpiredOnly
    )
    
    try {
        Write-StructuredLog -Message "Clearing cache" -Level INFO
        $startTime = Get-Date
        
        $result = New-CacheResult -Operation "clear" -Key "*"
        $removedCount = 0
        $totalSize = 0
        
        # Get keys to remove
        $keysToRemove = $script:CacheStore.Keys
        if ($Pattern) {
            $keysToRemove = $keysToRemove | Where-Object { $_ -like $Pattern }
        }
        
        foreach ($key in $keysToRemove) {
            $entry = $script:CacheStore[$key]
            
            if ($RemoveExpiredOnly -and $entry.expires -gt (Get-Date)) {
                continue
            }
            
            # Calculate size before removal
            $size = 0
            if ($entry.value -is [string]) {
                $size = [System.Text.Encoding]::UTF8.GetByteCount($entry.value)
            }
            elseif ($entry.value -is [byte[]]) {
                $size = $entry.value.Length
            }
            else {
                $size = [System.Text.Encoding]::UTF8.GetByteCount(($entry.value | ConvertTo-Json -Compress))
            }
            
            $null = $script:CacheStore.TryRemove($key, [ref]$null)
            $removedCount++
            $totalSize += $size
        }
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = $removedCount
            memory_used_mb = [Math]::Round($totalSize / 1MB, 2)
        }
        
        Write-StructuredLog -Message "Cache cleared" -Level INFO -Properties @{
            pattern = $Pattern
            removed_count = $removedCount
            total_size_bytes = $totalSize
            expired_only = $RemoveExpiredOnly
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to clear cache: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-CacheStatistics {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Getting cache statistics" -Level INFO
        $startTime = Get-Date
        
        $result = New-CacheResult -Operation "stats" -Key "*"
        
        $stats = @{
            total_items = $script:CacheStore.Count
            total_size_bytes = 0
            total_hits = 0
            expired_items = 0
            avg_item_size_bytes = 0
            memory_used_mb = 0
        }
        
        foreach ($entry in $script:CacheStore.Values) {
            # Calculate size
            $size = 0
            if ($entry.value -is [string]) {
                $size = [System.Text.Encoding]::UTF8.GetByteCount($entry.value)
            }
            elseif ($entry.value -is [byte[]]) {
                $size = $entry.value.Length
            }
            else {
                $size = [System.Text.Encoding]::UTF8.GetByteCount(($entry.value | ConvertTo-Json -Compress))
            }
            
            $stats.total_size_bytes += $size
            $stats.total_hits += $entry.hits
            
            if ($entry.expires -lt (Get-Date)) {
                $stats.expired_items++
            }
        }
        
        if ($stats.total_items -gt 0) {
            $stats.avg_item_size_bytes = [Math]::Round($stats.total_size_bytes / $stats.total_items)
        }
        
        $stats.memory_used_mb = [Math]::Round($stats.total_size_bytes / 1MB, 2)
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = $stats.total_items
            memory_used_mb = $stats.memory_used_mb
        }
        
        Write-StructuredLog -Message "Cache statistics retrieved" -Level INFO -Properties $stats
        
        return @{
            statistics = $stats
            metadata = $result
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to get cache statistics: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

Export-ModuleMember -Function Set-CacheValue, Get-CacheValue, Remove-CacheValue, Clear-Cache, Get-CacheStatistics
