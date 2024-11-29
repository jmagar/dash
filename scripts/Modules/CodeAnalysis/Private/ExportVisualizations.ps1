# Internal visualization helper functions
function New-VisualizationTemplate {
    param(
        [Parameter(Mandatory)]
        [string]$Type,
        [Parameter()]
        [hashtable]$Options
    )
    
    try {
        $templatePath = Join-Path $PSScriptRoot "../Templates/visualization.html"
        if (-not (Test-Path $templatePath)) {
            throw "Template file not found: $templatePath"
        }
        
        $template = Get-Content $templatePath -Raw
        return $template
    }
    catch {
        Write-Error "Failed to create visualization template: $_"
        return $null
    }
}

function Format-VisualizationData {
    param(
        [Parameter(Mandatory)]
        [object]$Data,
        [Parameter()]
        [string]$Format = 'html'
    )
    
    try {
        switch ($Format.ToLower()) {
            'html' {
                return $Data | ConvertTo-Html -Fragment
            }
            'json' {
                return $Data | ConvertTo-Json -Depth 10
            }
            default {
                throw "Unsupported format: $Format"
            }
        }
    }
    catch {
        Write-Error "Failed to format visualization data: $_"
        return $null
    }
}

# Do not export these functions as they are internal helpers
