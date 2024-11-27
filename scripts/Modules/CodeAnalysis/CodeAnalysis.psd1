@{
    RootModule = 'CodeAnalysis.psm1'
    ModuleVersion = '1.0.0'
    GUID = 'f8dbd9c4-5a06-4142-8f8c-2c0c9f4e2b2d'
    Author = 'Dash Team'
    Description = 'Code analysis and refactoring tools'
    PowerShellVersion = '5.1'
    FunctionsToExport = @(
        'Invoke-CodeAnalysis',
        'Get-CodePatterns',
        'Get-RefactoringOpportunity'
    )
    PrivateData = @{
        PSData = @{
            Tags = @('code-analysis', 'refactoring', 'static-analysis')
            ProjectUri = 'https://github.com/your-org/dash'
        }
    }
}
