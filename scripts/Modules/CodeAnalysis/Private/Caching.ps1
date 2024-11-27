# Module-level cache configuration
$script:CacheConfig = @{
    Enabled = $true
    Directory = Join-Path $PSScriptRoot "../Data/Cache"
    MaxAge = [TimeSpan]::FromDays(7)
}

# Cache key generation and validation
function New-CacheKey {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        
        [Parameter(Mandatory)]
        [string]$AnalysisType
    )
    
    try {
        # Get file hash and last write time
        $fileHash = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash
        $lastWrite = (Get-Item $FilePath).LastWriteTimeUtc.Ticks
        
        # Combine with analysis type for unique key
        $keyComponents = @($fileHash, $lastWrite, $AnalysisType)
        $combinedKey = $keyComponents -join "|"
        
        # Create final hash
        $keyHash = [System.BitConverter]::ToString(
            [System.Security.Cryptography.SHA256]::Create().ComputeHash(
                [System.Text.Encoding]::UTF8.GetBytes($combinedKey)
            )
        ).Replace("-", "")
        
        return $keyHash
    }
    catch {
        Write-Warning "Failed to generate cache key for $FilePath : $_"
        return $null
    }
}

function Get-CacheItem {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Key
    )
    
    if (-not $script:CacheConfig.Enabled) { return $null }
    
    $cachePath = Join-Path $script:CacheConfig.Directory "$Key.json"
    if (-not (Test-Path $cachePath)) { return $null }
    
    try {
        $cacheItem = Get-Content $cachePath -Raw | ConvertFrom-Json
        
        # Check if cache is expired
        $cacheAge = [DateTime]::UtcNow - [DateTime]::Parse($cacheItem.timestamp)
        if ($cacheAge -gt $script:CacheConfig.MaxAge) {
            Remove-Item $cachePath -Force
            return $null
        }
        
        return $cacheItem.data
    }
    catch {
        Write-Warning "Failed to retrieve cache item $Key : $_"
        return $null
    }
}

function Set-CacheItem {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Key,
        
        [Parameter(Mandatory)]
        [object]$Data
    )
    
    if (-not $script:CacheConfig.Enabled) { return }
    
    try {
        # Ensure cache directory exists
        if (-not (Test-Path $script:CacheConfig.Directory)) {
            New-Item -Path $script:CacheConfig.Directory -ItemType Directory -Force | Out-Null
        }
        
        $cacheItem = @{
            timestamp = [DateTime]::UtcNow.ToString("o")
            data = $Data
        }
        
        $cachePath = Join-Path $script:CacheConfig.Directory "$Key.json"
        $cacheItem | ConvertTo-Json -Depth 10 | Set-Content $cachePath -Force
    }
    catch {
        Write-Warning "Failed to cache item $Key : $_"
    }
}

function Clear-CacheItems {
    [CmdletBinding()]
    param(
        [switch]$Force
    )
    
    if (-not $script:CacheConfig.Enabled) { return }
    
    try {
        if (-not (Test-Path $script:CacheConfig.Directory)) { return }
        
        $cacheFiles = Get-ChildItem $script:CacheConfig.Directory -Filter "*.json"
        foreach ($file in $cacheFiles) {
            if ($Force) {
                Remove-Item $file.FullName -Force
                continue
            }
            
            try {
                $cacheItem = Get-Content $file.FullName -Raw | ConvertFrom-Json
                $cacheAge = [DateTime]::UtcNow - [DateTime]::Parse($cacheItem.timestamp)
                if ($cacheAge -gt $script:CacheConfig.MaxAge) {
                    Remove-Item $file.FullName -Force
                }
            }
            catch {
                Write-Warning "Failed to process cache file $($file.Name) : $_"
                # Remove corrupted cache files
                Remove-Item $file.FullName -Force
            }
        }
    }
    catch {
        Write-Warning "Failed to clear cache : $_"
    }
}

# Initialize cache on module load
if ($script:CacheConfig.Enabled) {
    # Create cache directory if it doesn't exist
    if (-not (Test-Path $script:CacheConfig.Directory)) {
        New-Item -Path $script:CacheConfig.Directory -ItemType Directory -Force | Out-Null
    }
    
    # Clear expired cache items on module load
    Clear-CacheItems
}

# Export functions
Export-ModuleMember -Function @(
    'New-CacheKey',
    'Get-CacheItem',
    'Set-CacheItem',
    'Clear-CacheItems'
)
