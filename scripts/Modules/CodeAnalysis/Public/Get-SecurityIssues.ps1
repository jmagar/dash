function Get-SecurityIssues {
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        [Parameter(Mandatory)]
        [string]$Language
    )
    
    try {
        $result = [PSCustomObject]@{
            issues = @()
            score = 100
        }
        
        # Check for Invoke-Expression
        if ($Content -match "Invoke-Expression") {
            $result.issues += [PSCustomObject]@{
                name = "Use of Invoke-Expression"
                severity = "high"
                description = "Invoke-Expression can be dangerous if used with untrusted input"
            }
            $result.score = 80
        }
        
        return $result
    }
    catch {
        Write-Error "Failed to analyze security: $_"
        return [PSCustomObject]@{
            issues = @()
            score = 100
        }
    }
}

Export-ModuleMember -Function Get-SecurityIssues
