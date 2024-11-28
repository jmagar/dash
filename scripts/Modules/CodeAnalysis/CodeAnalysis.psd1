@{
    RootModule = 'CodeAnalysis.psm1'
    ModuleVersion = '0.1.0'
    GUID = '12345678-1234-1234-1234-123456789012'
    Author = 'Dash Team'
    CompanyName = 'Dash'
    Copyright = '(c) 2023. All rights reserved.'
    Description = 'Code Analysis Module for Pattern Detection and Analysis'
    PowerShellVersion = '5.1'
    
    # Required modules
    RequiredModules = @(
        @{ ModuleName = 'PSSQLite'; ModuleVersion = '1.1.0' }
    )
    
    # Functions to export from this module
    FunctionsToExport = @(
        'Invoke-CodeAnalysis',
        'Export-CodeVisualization'
    )
    
    # Private data to pass to the module specified in RootModule/ModuleToProcess
    PrivateData = @{
        PSData = @{
            Tags = @('CodeAnalysis', 'StaticAnalysis', 'Security')
            ProjectUri = ''
            LicenseUri = ''
        }
    }
}
