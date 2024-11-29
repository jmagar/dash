function Get-CodePatterns {
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$Language
    )
    
    try {
        # Define patterns to look for
        $patterns = @(
            [PSCustomObject]@{
                name = "Array concatenation"
                pattern = "\+="
            },
            [PSCustomObject]@{
                name = "Invoke-Expression"
                pattern = "Invoke-Expression"
            }
        )
        
        # Find matches
        $matched = @()
        foreach ($pattern in $patterns) {
            if ($Content -match $pattern.pattern) {
                $matched += $pattern
            }
        }
        
        return [PSCustomObject]@{
            patterns = $patterns
            matched = $matched
        }
    }
    catch {
        Write-Error "Failed to analyze patterns: $_"
        return [PSCustomObject]@{
            patterns = @()
            matched = @()
        }
    }
}

Export-ModuleMember -Function Get-CodePatterns
