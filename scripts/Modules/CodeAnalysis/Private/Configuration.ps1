using namespace System.Management.Automation.Language

# Import required modules
. $PSScriptRoot/Logging.ps1

function New-ConfigResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$Target,
        [Parameter()]
        [hashtable]$Context = @{}
    )
    
    return @{
        metadata = @{
            operation = $Operation
            target = $Target
            timestamp = Get-Date -Format "o"
            version = "1.0"
            session_id = [guid]::NewGuid().ToString()
        }
        context = $Context
        config = @{
            settings = @{}
            overrides = @{}
            defaults = @{}
        }
        metrics = @{
            duration_ms = 0
            items_processed = 0
            changes_made = 0
        }
        status = @{
            success = $true
            warnings = @()
            errors = @()
        }
    }
}

function Initialize-Configuration {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Initializing configuration" -Level INFO
        $startTime = Get-Date
        
        $result = New-ConfigResult -Operation "initialize" -Target "module-config"
        
        # Define default configuration
        $defaultConfig = @{
            Version = "1.0.0"
            SessionId = [guid]::NewGuid().ToString()
            LogDirectory = Join-Path $PSScriptRoot "../logs"
            ConsoleLogging = $true
            Security = @{
                RequireAdmin = $false
                AllowedPaths = @("$PSScriptRoot/..")
                MaxFileSize = "100MB"
                Thresholds = @{
                    CPU = 80
                    Memory = 80
                    Disk = 80
                }
            }
            Performance = @{
                BatchSize = 1000
                MaxParallelism = 4
                CacheEnabled = $true
                CacheExpiration = "1.00:00:00"
                Timeouts = @{
                    Default = "00:05:00"
                    Analysis = "00:10:00"
                    Training = "01:00:00"
                }
            }
            MachineLearning = @{
                PythonPath = "python"
                ModelDirectory = Join-Path $PSScriptRoot "../models"
                BatchSize = 32
                EpochCount = 10
                ValidationSplit = 0.2
            }
            Indexing = @{
                MaxFileSize = "10MB"
                ExcludePatterns = @("*.exe", "*.dll", "*.pdb")
                CacheEnabled = $true
                CacheExpiration = "1.00:00:00"
            }
            Patterns = @{
                MaxComplexity = 20
                MinConfidence = 0.8
                CacheEnabled = $true
                CacheExpiration = "1.00:00:00"
            }
            DataManagement = @{
                DatabasePath = Join-Path $PSScriptRoot "../data/analysis.db"
                BackupEnabled = $true
                BackupInterval = "1.00:00:00"
                MaxStorageSize = "1GB"
            }
        }
        
        # Create configuration directory if it doesn't exist
        $configDir = Join-Path $PSScriptRoot "../Config"
        if (-not (Test-Path $configDir)) {
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        }
        
        # Load or create module configuration
        $configPath = Join-Path $configDir "module-config.json"
        if (Test-Path $configPath) {
            $existingConfig = Get-Content $configPath -Raw | ConvertFrom-Json -AsHashtable
            $config = Merge-Hashtables $defaultConfig $existingConfig
        }
        else {
            $config = $defaultConfig
            $config | ConvertTo-Json -Depth 10 | Set-Content $configPath
        }
        
        # Create required directories
        @(
            $config.LogDirectory,
            $config.MachineLearning.ModelDirectory,
            (Split-Path $config.DataManagement.DatabasePath)
        ) | ForEach-Object {
            if (-not (Test-Path $_)) {
                New-Item -ItemType Directory -Path $_ -Force | Out-Null
            }
        }
        
        # Set script-level configuration
        $script:Config = $config
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = 1
            changes_made = 0
        }
        
        Write-StructuredLog -Message "Configuration initialized" -Level INFO -Properties @{
            version = $config.Version
            session_id = $config.SessionId
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to initialize configuration: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-ModuleConfiguration {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$Section
    )
    
    try {
        Write-StructuredLog -Message "Getting module configuration" -Level INFO
        $startTime = Get-Date
        
        $result = New-ConfigResult -Operation "get" -Target "module-config"
        
        if (-not $script:Config) {
            Initialize-Configuration | Out-Null
        }
        
        if ($Section) {
            if (-not $script:Config.ContainsKey($Section)) {
                throw "Configuration section not found: $Section"
            }
            $config = @{ $Section = $script:Config[$Section] }
        }
        else {
            $config = $script:Config
        }
        
        $result.config.settings = $config
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = 1
            changes_made = 0
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to get configuration: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Update-ModuleConfiguration {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Section,
        [Parameter(Mandatory)]
        [hashtable]$Settings,
        [switch]$Merge
    )
    
    try {
        Write-StructuredLog -Message "Updating module configuration" -Level INFO
        $startTime = Get-Date
        
        $result = New-ConfigResult -Operation "update" -Target "module-config"
        
        if (-not $script:Config) {
            Initialize-Configuration | Out-Null
        }
        
        # Validate section exists
        if (-not $script:Config.ContainsKey($Section)) {
            throw "Configuration section not found: $Section"
        }
        
        # Update configuration
        if ($Merge) {
            $script:Config[$Section] = Merge-Hashtables $script:Config[$Section] $Settings
        }
        else {
            $script:Config[$Section] = $Settings
        }
        
        # Save configuration
        $configPath = Join-Path $PSScriptRoot "../Config/module-config.json"
        $script:Config | ConvertTo-Json -Depth 10 | Set-Content $configPath
        
        $result.config.settings = $script:Config[$Section]
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = 1
            changes_made = 1
        }
        
        Write-StructuredLog -Message "Configuration updated" -Level INFO -Properties @{
            section = $Section
            settings = $Settings | ConvertTo-Json -Compress
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to update configuration: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Reset-ModuleConfiguration {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$Section
    )
    
    try {
        Write-StructuredLog -Message "Resetting module configuration" -Level INFO
        $startTime = Get-Date
        
        $result = New-ConfigResult -Operation "reset" -Target "module-config"
        
        # Initialize with defaults
        $defaultResult = Initialize-Configuration
        if (-not $defaultResult.status.success) {
            throw "Failed to initialize default configuration"
        }
        
        if ($Section) {
            # Reset specific section
            $original = $script:Config[$Section]
            $script:Config[$Section] = $defaultResult.config.settings[$Section]
            $result.config.settings = @{
                $Section = @{
                    previous = $original
                    current = $script:Config[$Section]
                }
            }
        }
        else {
            # Reset entire configuration
            $original = $script:Config
            $script:Config = $defaultResult.config.settings
            $result.config.settings = @{
                previous = $original
                current = $script:Config
            }
        }
        
        # Save configuration
        $configPath = Join-Path $PSScriptRoot "../Config/module-config.json"
        $script:Config | ConvertTo-Json -Depth 10 | Set-Content $configPath
        
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = 1
            changes_made = 1
        }
        
        Write-StructuredLog -Message "Configuration reset" -Level INFO -Properties @{
            section = $Section ?? "all"
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to reset configuration: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Merge-Hashtables {
    param(
        [Parameter(Mandatory)]
        [hashtable]$Original,
        [Parameter(Mandatory)]
        [hashtable]$Update
    )
    
    $result = $Original.Clone()
    
    foreach ($key in $Update.Keys) {
        if ($result.ContainsKey($key) -and $result[$key] -is [hashtable] -and $Update[$key] -is [hashtable]) {
            $result[$key] = Merge-Hashtables $result[$key] $Update[$key]
        }
        else {
            $result[$key] = $Update[$key]
        }
    }
    
    return $result
}

# Initialize configuration on module import
Initialize-Configuration | Out-Null

Export-ModuleMember -Function Get-ModuleConfiguration, Update-ModuleConfiguration, Reset-ModuleConfiguration
