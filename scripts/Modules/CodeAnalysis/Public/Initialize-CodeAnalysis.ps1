function Initialize-CodeAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [Parameter()]
        [string]$OutputPath = "$PSScriptRoot/../Output"
    )
    
    try {
        Write-Verbose "Initializing code analysis"
        
        # Get module configuration
        $config = Get-ModuleConfiguration
        if (-not $config.status.success) {
            throw "Failed to get module configuration"
        }
        
        # Initialize components
        $initResult = @{
            dataStore = Initialize-DataStore
            index = Initialize-Index
            status = @{
                success = $true
                errors = @()
            }
        }
        
        if (-not $initResult.dataStore) {
            $initResult.status.success = $false
            $initResult.status.errors += "Failed to initialize data store"
        }
        
        if (-not $initResult.index) {
            $initResult.status.success = $false
            $initResult.status.errors += "Failed to initialize index"
        }
        
        if (-not $initResult.status.success) {
            throw ($initResult.status.errors -join "; ")
        }
        
        Write-Verbose "Code analysis initialized successfully"
        return $true
    }
    catch {
        Write-Error "Failed to initialize code analysis: $_"
        return $false
    }
}

Export-ModuleMember -Function Initialize-CodeAnalysis
