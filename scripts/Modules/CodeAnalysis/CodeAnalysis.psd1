@{
    ModuleVersion = '1.0.0'
    GUID = '12345678-1234-1234-1234-123456789012'
    Author = 'Dash Team'
    Description = 'AST-based Code Analysis Module for TypeScript/JavaScript, Go, and PowerShell'
    PowerShellVersion = '5.1'
    RootModule = 'CodeAnalysis.psm1'
    FunctionsToExport = @(
        'Invoke-CodeAnalysis'
    )
    PrivateData = @{
        PSData = @{
            Tags = @('CodeAnalysis', 'AST', 'TypeScript', 'JavaScript', 'Go', 'PowerShell', 'Security', 'Performance')
            ProjectUri = ''
            LicenseUri = ''
            ReleaseNotes = @'
Initial release of AST-based code analysis module:
- Single command interface for project-wide analysis
- Multi-language support (TypeScript, JavaScript, Go, PowerShell)
- Pattern detection for security, performance, and best practices
- Documentation and test coverage analysis
- Multiple output formats (Summary, Detailed, JSON)
'@
        }
    }
}
