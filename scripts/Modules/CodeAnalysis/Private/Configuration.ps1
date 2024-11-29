# Script-level configuration store
$script:Config = $null

function Initialize-Configuration {
    [CmdletBinding()]
    param()
    
    try {
        Write-Verbose "Initializing module configuration"
        
        # Load module configuration
        $configPath = Join-Path $PSScriptRoot "../Config/module-config.json"
        if (-not (Test-Path $configPath)) {
            return @{
                config = $null
                status = @{
                    success = $false
                    initialized = $false
                    errors = @("Configuration file not found: $configPath")
                }
            }
        }
        
        $configJson = Get-Content $configPath -Raw | ConvertFrom-Json
        
        # Create output directories
        $outputPaths = @(
            $configJson.fileSystem.outputDirectory,
            $configJson.fileSystem.indexPath,
            $configJson.fileSystem.cacheDirectory,
            $configJson.fileSystem.logsPath
        )
        
        foreach ($path in $outputPaths) {
            $fullPath = Join-Path $PSScriptRoot "../$path"
            if (-not (Test-Path $fullPath)) {
                New-Item -Path $fullPath -ItemType Directory -Force | Out-Null
            }
        }
        
        # Store configuration
        $script:Config = @{
            config = $configJson
            status = @{
                success = $true
                initialized = $true
                errors = @()
            }
            runtime = @{
                startTime = Get-Date
                sessionId = [guid]::NewGuid().ToString()
                version = $configJson.version
            }
            settings = @{
                Output = @{
                    LogDirectory = Join-Path $PSScriptRoot "../$($configJson.fileSystem.logsPath)"
                    DataDirectory = Join-Path $PSScriptRoot "../$($configJson.fileSystem.outputDirectory)"
                    IndexDirectory = Join-Path $PSScriptRoot "../$($configJson.fileSystem.indexPath)"
                    CacheDirectory = Join-Path $PSScriptRoot "../$($configJson.fileSystem.cacheDirectory)"
                    ReportDirectory = Join-Path $PSScriptRoot "../$($configJson.fileSystem.outputDirectory)/reports"
                }
                ConsoleLogging = $true
                SessionId = [guid]::NewGuid().ToString()
            }
        }
        
        return $script:Config
    }
    catch {
        return @{
            config = $null
            status = @{
                success = $false
                initialized = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

function Get-ModuleConfiguration {
    [CmdletBinding()]
    param()
    
    if (-not $script:Config) {
        return Initialize-Configuration
    }
    
    return $script:Config
}

function Update-ModuleConfiguration {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Settings
    )
    
    try {
        # Get current configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            return @{
                config = $null
                status = @{
                    success = $false
                    initialized = $false
                    errors = @("Failed to get current configuration")
                }
            }
        }
        
        # Update settings
        foreach ($key in $Settings.Keys) {
            $config.settings[$key] = $Settings[$key]
        }
        
        # Update timestamp
        $config.runtime.lastUpdated = Get-Date
        
        return $config
    }
    catch {
        return @{
            config = $null
            status = @{
                success = $false
                initialized = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

function Reset-ModuleConfiguration {
    [CmdletBinding()]
    param()
    
    try {
        # Clear current configuration
        $script:Config = $null
        
        # Reinitialize
        return Initialize-Configuration
    }
    catch {
        return @{
            config = $null
            status = @{
                success = $false
                initialized = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

Export-ModuleMember -Function Get-ModuleConfiguration, Update-ModuleConfiguration, Reset-ModuleConfiguration
