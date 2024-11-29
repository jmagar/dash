# Import required modules
. $PSScriptRoot/../Private/Logging.ps1
. $PSScriptRoot/../Private/Configuration.ps1

function Export-CodeVisualization {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Data,
        [Parameter(Mandatory)]
        [string]$Template,
        [Parameter()]
        [string]$OutputPath
    )
    
    try {
        # Initialize logging if not already initialized
        if (-not $script:LogConfig) {
            Initialize-Logging | Out-Null
        }
        
        Write-StructuredLog -Message "Exporting code visualization" -Level INFO
        
        # Initialize result with template
        $visualizationResult = $Template
        
        # Replace simple variables
        foreach ($key in $Data.Keys) {
            $value = if ($Data[$key] -is [hashtable] -or $Data[$key] -is [array]) {
                $Data[$key] | ConvertTo-Json -Depth 10 -Compress
            }
            else {
                $Data[$key]
            }
            $visualizationResult = $visualizationResult.Replace("{{$key}}", $value)
        }
        
        # Handle each blocks
        $eachMatches = [regex]::Matches($visualizationResult, '{{#each ([^}]+)}}(.*?){{/each}}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
        foreach ($match in $eachMatches) {
            $regexGroups = @{
                array = $match.Groups[1].Value
                template = $match.Groups[2].Value
            }
            
            $items = $Data[$regexGroups.array]
            $replacement = ""
            
            if ($items) {
                foreach ($item in $items) {
                    $itemContent = $regexGroups.template
                    if ($item -is [hashtable]) {
                        foreach ($key in $item.Keys) {
                            $itemContent = $itemContent.Replace("{{this.$key}}", $item[$key])
                        }
                    }
                    else {
                        $itemContent = $itemContent.Replace("{{this}}", $item)
                    }
                    $replacement += $itemContent
                }
            }
            
            $visualizationResult = $visualizationResult.Replace($match.Value, $replacement)
        }
        
        # Handle if blocks
        $ifMatches = [regex]::Matches($visualizationResult, '{{#if ([^}]+)}}(.*?){{/if}}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
        foreach ($match in $ifMatches) {
            $regexGroups = @{
                condition = $match.Groups[1].Value
                content = $match.Groups[2].Value
            }
            
            if ($Data[$regexGroups.condition]) {
                $visualizationResult = $visualizationResult.Replace($match.Value, $regexGroups.content)
            }
            else {
                $visualizationResult = $visualizationResult.Replace($match.Value, "")
            }
        }
        
        # Write to output file if path provided
        if ($OutputPath) {
            $outputDir = Split-Path $OutputPath -Parent
            if (-not (Test-Path $outputDir)) {
                New-Item -Path $outputDir -ItemType Directory -Force | Out-Null
            }
            Set-Content -Path $OutputPath -Value $visualizationResult
        }
        
        Write-StructuredLog -Message "Code visualization exported successfully" -Level INFO -Properties @{
            outputPath = $OutputPath
            templateSize = $Template.Length
            resultSize = $visualizationResult.Length
        }
        
        return @{
            visualization = @{
                content = $visualizationResult
                path = $OutputPath
                size = $visualizationResult.Length
            }
            status = @{
                success = $true
                errors = @()
            }
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to export code visualization: $_" -Level ERROR
        return @{
            visualization = $null
            status = @{
                success = $false
                errors = @($_.Exception.Message)
            }
        }
    }
}

Export-ModuleMember -Function Export-CodeVisualization
