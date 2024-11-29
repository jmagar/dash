# Module state management
$script:moduleState = @{
    initialized = $false
    config = @{}
    tsPath = $null
}

function Initialize-ModuleState {
    [CmdletBinding()]
    param(
        [Parameter()]
        [hashtable]$Configuration = @{}
    )
    
    try {
        # Verify TypeScript is available in the project
        $tsPath = Join-Path $PSScriptRoot "../../../node_modules/typescript"
        if (-not (Test-Path $tsPath)) {
            Write-Warning "TypeScript not found at $tsPath. Some features may be limited."
        }
        else {
            Write-Verbose "TypeScript found at: $tsPath"
        }

        # Initialize state
        $script:moduleState = @{
            initialized = $true
            config = $Configuration
            tsPath = $tsPath
        }
        
        return @{
            success = $true
            message = "Module state initialized successfully"
        }
    }
    catch {
        Write-Error "Failed to initialize module state: $_"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

function Get-ModuleState {
    return $script:moduleState
}

function Reset-ModuleState {
    $script:moduleState = @{
        initialized = $false
        config = @{}
        tsPath = $null
    }
}

Export-ModuleMember -Function Initialize-ModuleState, Get-ModuleState, Reset-ModuleState
