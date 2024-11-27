# Set strict mode for better error detection
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Get the module path
$modulePath = $PSScriptRoot

# Import configuration
$script:Config = Get-Content "$modulePath/Config/module-config.json" | ConvertFrom-Json
$script:Patterns = Get-Content "$modulePath/Config/patterns.json" | ConvertFrom-Json

# Import all private functions
$privateFunctions = @(
    Get-ChildItem -Path "$modulePath/Private/*.ps1" -ErrorAction SilentlyContinue
)

foreach ($function in $privateFunctions) {
    try {
        . $function.FullName
        Write-Verbose "Imported private function: $($function.BaseName)"
    }
    catch {
        Write-Error "Failed to import private function $($function.FullName): $_"
    }
}

# Import all public functions
$publicFunctions = @(
    Get-ChildItem -Path "$modulePath/Public/*.ps1" -ErrorAction SilentlyContinue
)

foreach ($function in $publicFunctions) {
    try {
        . $function.FullName
        Write-Verbose "Imported public function: $($function.BaseName)"
    }
    catch {
        Write-Error "Failed to import public function $($function.FullName): $_"
    }
}

# Export public functions
Export-ModuleMember -Function $publicFunctions.BaseName

# Initialize module-level variables
$script:LogFile = $null
$script:CorrelationId = $null

# Cleanup on module removal
$MyInvocation.MyCommand.ScriptBlock.Module.OnRemove = {
    if ($script:LogFile) {
        Stop-ScriptLogging -ScriptName "CodeAnalysis" -Status "ModuleUnloaded"
    }
}
