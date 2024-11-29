# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

# Initialize cache store
$script:Cache = @{}

function Get-CacheValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Key
    )
    
    try {
        # Initialize logging if not already initialized
        if (-not $script:LogConfig) {
            Initialize-Logging | Out-Null
        }
        
        Write-StructuredLog -Message "Getting cache value" -Level DEBUG
        
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        # Check if key exists in cache
        if (-not $script:Cache.ContainsKey($Key)) {
            return @{
                cache = @{
                    hit = $false
                    value = $null
                }
                status = @{
                    success = $true
                    errors = @()
                }
            }
        }
        
        $cacheEntry = $script:Cache[$Key]
        
        # Check if cache entry has expired
        if ($cacheEntry.expiry -lt (Get-Date)) {
            $script:Cache.Remove($Key)
            return @{
                cache = @{
                    hit = $false
                    value = $null
                }
                status = @{
                    success = $true
                    errors = @()
                }
            }
        }
        
        return @{
            cache = @{
                hit = $true
                value = $cacheEntry.value
                created = $cacheEntry.created
                expiry = $cacheEntry.expiry
            }
            status = @{
                success = $true
                errors = @()
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to get cache value: $_" -Level ERROR
        return @{
            cache = @{
                hit = $false
                value = $null
            }
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
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
        [int]$TimeToLive = 3600
    )
    
    try {
        Write-StructuredLog -Message "Setting cache value" -Level DEBUG
        
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        # Create cache entry
        $cacheEntry = @{
            value = $Value
            created = Get-Date
            expiry = (Get-Date).AddSeconds($TimeToLive)
        }
        
        # Add to cache
        $script:Cache[$Key] = $cacheEntry
        
        # Check cache size
        if ($script:Cache.Count -gt $config.fileSystem.maxCacheSize) {
            # Remove oldest entries
            $oldestKeys = $script:Cache.Keys |
                Sort-Object { $script:Cache[$_].created } |
                Select-Object -First ($script:Cache.Count - $config.fileSystem.maxCacheSize)
            
            foreach ($oldKey in $oldestKeys) {
                $script:Cache.Remove($oldKey)
            }
        }
        
        return @{
            cache = @{
                key = $Key
                created = $cacheEntry.created
                expiry = $cacheEntry.expiry
            }
            status = @{
                success = $true
                errors = @()
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to set cache value: $_" -Level ERROR
        return @{
            cache = $null
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

function Remove-CacheValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Key
    )
    
    try {
        Write-StructuredLog -Message "Removing cache value" -Level DEBUG
        
        # Remove from cache
        $removed = $script:Cache.Remove($Key)
        
        return @{
            cache = @{
                key = $Key
                removed = $removed
            }
            status = @{
                success = $true
                errors = @()
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to remove cache value: $_" -Level ERROR
        return @{
            cache = $null
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

function Clear-Cache {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Clearing cache" -Level INFO
        
        # Clear all cache entries
        $script:Cache.Clear()
        
        return @{
            cache = @{
                cleared = $true
                timestamp = Get-Date
            }
            status = @{
                success = $true
                errors = @()
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to clear cache: $_" -Level ERROR
        return @{
            cache = $null
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
    finally {
        # Ensure cache is cleared even if logging fails
        $script:Cache = @{}
    }
}

Export-ModuleMember -Function Get-CacheValue, Set-CacheValue, Remove-CacheValue, Clear-Cache
