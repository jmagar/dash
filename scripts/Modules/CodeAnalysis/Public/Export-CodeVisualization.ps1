<#
.SYNOPSIS
    Generates visual representations of code analysis results.

.DESCRIPTION
    Creates various types of visualizations from code analysis data, including:
    - Mermaid diagrams for documentation
    - Interactive D3 visualizations
    - Graphviz diagrams
    Each format provides different insights into code patterns, relationships,
    and potential issues.

.PARAMETER AnalysisName
    Name of the analysis run to visualize. This should match the OutputName used
    in Invoke-CodeAnalysis.

.PARAMETER OutputName
    Name for the visualization output. Default is analysis name with format suffix.

.PARAMETER Format
    The visualization format to generate. Available options:
    - mermaid: Creates a Mermaid diagram (good for documentation)
    - d3: Creates an interactive HTML visualization
    - graphviz: Creates a DOT file and PNG (if Graphviz is installed)
    Default: 'd3'

.PARAMETER OpenInBrowser
    For d3 format, automatically opens the visualization in default browser.
    Only applies to d3 format.

.EXAMPLE
    Export-CodeVisualization -AnalysisName "weekly-scan" -Format d3
    Creates an interactive D3 visualization from analysis results.

.EXAMPLE
    Export-CodeVisualization -AnalysisName "weekly-scan" -Format mermaid
    Generates a Mermaid diagram for documentation.

.OUTPUTS
    Depending on the format:
    - mermaid: Creates dependencies.mmd
    - d3: Creates visualization.html
    - graphviz: Creates dependencies.dot and dependencies.png

.NOTES
    Requires PowerShell 5.1 or later
    Author: Dash Team
    Last Modified: 2024-02-07

.LINK
    https://github.com/your-org/dash/wiki/code-visualization
#>
function Export-CodeVisualization {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [string]$AnalysisName,
        
        [Parameter(Position = 1)]
        [string]$OutputName,
        
        [Parameter(Position = 2)]
        [ValidateSet('mermaid', 'd3', 'graphviz')]
        [string]$Format = 'd3',
        
        [Parameter()]
        [switch]$OpenInBrowser
    )
    
    begin {
        try {
            # Load module configuration
            $moduleConfig = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json
            
            # Set up paths
            $analysisRoot = Join-Path $PSScriptRoot "../$($moduleConfig.paths.output.data)"
            $analysisPath = Join-Path $analysisRoot $AnalysisName
            $visualizationRoot = Join-Path $PSScriptRoot "../$($moduleConfig.paths.output.visualizations)"
            
            # Validate analysis exists
            if (-not (Test-Path $analysisPath)) {
                throw [CodeAnalysisException]::new(
                    "Analysis '$AnalysisName' not found at path: $analysisPath",
                    "InvalidAnalysis"
                )
            }
            
            # Set output name if not provided
            if (-not $OutputName) {
                $OutputName = "$AnalysisName-$Format"
            }
            
            $outputPath = Join-Path $visualizationRoot $OutputName
            
            # Create output directory
            if (-not (Test-Path $outputPath)) {
                New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
            }
            
            # Load analysis data
            $analysisData = Get-Content "$analysisPath/details.json" | ConvertFrom-Json
            $summary = Get-Content "$analysisPath/summary.json" | ConvertFrom-Json
            
            if (-not $analysisData -or -not $summary) {
                throw [CodeAnalysisException]::new(
                    "Invalid or corrupt analysis data",
                    "DataValidation"
                )
            }
            
            Write-StructuredLog -Message "Starting visualization export" -Level INFO -Properties @{
                format = $Format
                analysisName = $AnalysisName
                outputPath = $outputPath
            }
        }
        catch {
            if ($_ -is [CodeAnalysisException]) {
                Write-ErrorLog $_
                throw
            }
            else {
                $ex = [CodeAnalysisException]::new(
                    "Failed to initialize visualization: $_",
                    "Initialization"
                )
                Write-ErrorLog -ErrorRecord $ex
                throw $ex
            }
        }
    }
    
    process {
        try {
            switch ($Format) {
                'mermaid' {
                    $diagram = @"
graph TD
    classDef pattern fill:#f9f,stroke:#333,stroke-width:2px;
    classDef component fill:#bbf,stroke:#333,stroke-width:2px;
    classDef issue fill:#fbb,stroke:#333,stroke-width:2px;
    
    %% Components and their relationships
    subgraph Components
"@
                    
                    # Add component nodes
                    foreach ($file in $analysisData.Values) {
                        $safeId = $file.file.Replace('-', '_').Replace('.', '_')
                        $diagram += "    $safeId[$($file.file)]:::component`n"
                        
                        # Add relationships based on patterns
                        foreach ($pattern in $file.patterns.PSObject.Properties) {
                            $patternId = "pattern_$($pattern.Name.Replace('-', '_'))"
                            $diagram += "    $patternId[$($pattern.Name)]:::pattern`n"
                            $diagram += "    $patternId --> $safeId`n"
                        }
                    }
                    
                    $diagram += @"
    end
    
    %% Security Issues
    subgraph Issues
"@
                    
                    # Add security issues
                    $issueId = 0
                    foreach ($file in $summary.security.highRiskFiles) {
                        $issueId++
                        $safeFileId = $file.Replace('-', '_').Replace('.', '_')
                        $diagram += "    issue_${issueId}[Security Risk]:::issue`n"
                        $diagram += "    issue_${issueId} --> $safeFileId`n"
                    }
                    
                    $diagram += "end"
                    
                    $diagram | Out-File "$outputPath/dependencies.mmd"
                    Write-StructuredLog -Message "Generated Mermaid diagram" -Level INFO
                }
                
                'd3' {
                    # Load template
                    $template = Get-Content "$PSScriptRoot/../$($moduleConfig.paths.templates.visualization)" -Raw
                    
                    # Replace placeholder with actual data
                    $visualizationContent = $template -replace 'ANALYSIS_DATA_PLACEHOLDER', ($analysisData | ConvertTo-Json -Depth 10)
                    
                    $visualizationContent | Out-File "$outputPath/visualization.html"
                    Write-StructuredLog -Message "Generated D3 visualization" -Level INFO
                    
                    if ($OpenInBrowser) {
                        Start-Process "$outputPath/visualization.html"
                        Write-StructuredLog -Message "Opened visualization in browser" -Level INFO
                    }
                }
                
                'graphviz' {
                    $dot = @"
digraph CodeAnalysis {
    node [style=filled];
    
"@
                    
                    # Add nodes
                    foreach ($file in $analysisData.Values) {
                        $safeId = $file.file.Replace('-', '_').Replace('.', '_')
                        $color = switch ($file.security) {
                            { $_ -gt $moduleConfig.analysis.securityThresholds.high } { $moduleConfig.visualization.colorScheme.file.highSecurity }
                            { $_ -gt $moduleConfig.analysis.securityThresholds.medium } { $moduleConfig.visualization.colorScheme.file.mediumSecurity }
                            default { $moduleConfig.visualization.colorScheme.file.lowSecurity }
                        }
                        $dot += "    `"$safeId`" [fillcolor=`"$color`"]`n"
                        
                        # Add relationships
                        foreach ($pattern in $file.patterns.PSObject.Properties) {
                            $patternId = "pattern_$($pattern.Name.Replace('-', '_'))"
                            $dot += "    `"$patternId`" [fillcolor=`"$($moduleConfig.visualization.colorScheme.pattern)`"]`n"
                            $dot += "    `"$patternId`" -> `"$safeId`"`n"
                        }
                    }
                    
                    $dot += "}"
                    
                    $dot | Out-File "$outputPath/dependencies.dot"
                    Write-StructuredLog -Message "Generated Graphviz diagram" -Level INFO
                    
                    # If Graphviz is installed, generate PNG
                    if (Get-Command "dot" -ErrorAction SilentlyContinue) {
                        dot -Tpng -o "$outputPath/dependencies.png" "$outputPath/dependencies.dot"
                        Write-StructuredLog -Message "Generated PNG visualization" -Level INFO
                    }
                    else {
                        Write-StructuredLog -Message "Graphviz not installed - skipping PNG generation" -Level WARN
                    }
                }
            }
            
            Write-StructuredLog -Message "Visualization export complete" -Level INFO -Properties @{
                format = $Format
                outputPath = $outputPath
            }
            
            return @{
                format = $Format
                outputPath = $outputPath
            }
        }
        catch {
            if ($_ -is [CodeAnalysisException]) {
                Write-ErrorLog $_
                throw
            }
            else {
                $ex = [CodeAnalysisException]::new(
                    "Failed to generate visualization: $_",
                    "Generation"
                )
                Write-ErrorLog -ErrorRecord $ex
                throw $ex
            }
        }
    }
    
    end {
        if ($OpenInBrowser -and $Format -eq 'd3') {
            Write-StructuredLog -Message "Visualization ready in browser" -Level INFO
        }
    }
}

Export-ModuleMember -Function Export-CodeVisualization
