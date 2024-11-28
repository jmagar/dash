using namespace System.Collections.Concurrent

# Import configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

# Load templates
$script:Templates = @{
    ComponentAnalysis = Get-Content "$PSScriptRoot/../Templates/Analysis/component-analysis.md" -Raw
    DependencyAnalysis = Get-Content "$PSScriptRoot/../Templates/Analysis/dependency-analysis.md" -Raw
    DirectoryAnalysis = Get-Content "$PSScriptRoot/../Templates/Analysis/directory-analysis.md" -Raw
    PerformanceAnalysis = Get-Content "$PSScriptRoot/../Templates/Analysis/performance-analysis.md" -Raw
    RefactoringRecommendations = Get-Content "$PSScriptRoot/../Templates/Analysis/refactoring-recommendations.md" -Raw
    SecurityAnalysis = Get-Content "$PSScriptRoot/../Templates/Analysis/security-analysis.md" -Raw
}

function Format-Template {
    param(
        [Parameter(Mandatory)]
        [string]$Template,
        [Parameter(Mandatory)]
        [hashtable]$Data
    )
    
    $result = $Template
    foreach ($key in $Data.Keys) {
        $value = if ($Data[$key] -is [array]) {
            ($Data[$key] | ForEach-Object { "- $_" }) -join "`n"
        } else {
            $Data[$key]
        }
        $result = $result.Replace("{{$key}}", $value)
    }
    
    # Handle each blocks
    $eachMatches = [regex]::Matches($result, '{{#each ([^}]+)}}(.*?){{/each}}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    foreach ($match in $eachMatches) {
        $regexGroups = @{
            arrayName = $match.Groups[1].Value
            template = $match.Groups[2].Value.Trim()
        }
        $array = $Data[$regexGroups.arrayName]
        
        if ($array) {
            $replacement = ($array | ForEach-Object {
                $itemTemplate = $regexGroups.template
                if ($_ -is [hashtable]) {
                    foreach ($key in $_.Keys) {
                        $itemTemplate = $itemTemplate.Replace("{{$key}}", $_[$key])
                    }
                } else {
                    $itemTemplate = $itemTemplate.Replace("{{this}}", $_)
                }
                $itemTemplate
            }) -join "`n"
        } else {
            $replacement = ""
        }
        
        $result = $result.Replace($match.Value, $replacement)
    }
    
    # Handle if blocks
    $ifMatches = [regex]::Matches($result, '{{#if ([^}]+)}}(.*?){{/if}}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    foreach ($match in $ifMatches) {
        $regexGroups = @{
            condition = $match.Groups[1].Value
            content = $match.Groups[2].Value
        }
        
        if ($Data[$regexGroups.condition]) {
            $result = $result.Replace($match.Value, $regexGroups.content)
        } else {
            $result = $result.Replace($match.Value, "")
        }
    }
    
    return $result
}

function Export-CodeVisualization {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$AnalysisName,
        
        [Parameter()]
        [string]$OutputName = $AnalysisName,
        
        [Parameter()]
        [ValidateSet('mermaid', 'd3', 'graphviz', 'markdown')]
        [string]$Format = 'markdown',
        
        [Parameter()]
        [ValidateSet('component', 'dependency', 'directory', 'performance', 'security', 'refactoring')]
        [string[]]$AnalysisTypes = @('component', 'dependency', 'performance', 'security', 'refactoring')
    )
    
    begin {
        Start-ScriptLogging -ScriptName 'Export-CodeVisualization'
        Write-StructuredLog -Message "Starting visualization export for $AnalysisName" -Level INFO -Properties @{
            format = $Format
            analysisTypes = $AnalysisTypes
        }
        
        # Validate analysis data exists
        $dataPath = Join-Path $script:Config.codeAnalysis.dataPath "$AnalysisName.json"
        if (-not (Test-Path $dataPath)) {
            $errorMsg = "Analysis data not found at path: $dataPath"
            Write-StructuredLog -Message $errorMsg -Level ERROR
            throw $errorMsg
        }
        
        try {
            $analysisData = Get-Content $dataPath -Raw | ConvertFrom-Json -AsHashtable
        }
        catch {
            Write-ErrorLog -ErrorRecord $_
            throw "Failed to load analysis data: $_"
        }
    }
    
    process {
        try {
            $outputDir = Join-Path $script:Config.codeAnalysis.visualization.outputPath $OutputName
            New-Item -Path $outputDir -ItemType Directory -Force | Out-Null
            
            foreach ($type in $AnalysisTypes) {
                $templateKey = $type.Substring(0,1).ToUpper() + $type.Substring(1) + "Analysis"
                if ($type -eq 'refactoring') {
                    $templateKey = "RefactoringRecommendations"
                }
                
                if (-not $script:Templates.ContainsKey($templateKey)) {
                    Write-StructuredLog -Message "Template not found: $templateKey" -Level WARN
                    continue
                }
                
                $template = $script:Templates[$templateKey]
                $data = @{
                    analysisName = $AnalysisName
                    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                    summary = $analysisData.summary
                }
                
                # Add type-specific data
                switch ($type) {
                    'component' {
                        $data['components'] = $analysisData.components
                        $data['metrics'] = $analysisData.metrics
                    }
                    'dependency' {
                        $data['dependencies'] = $analysisData.dependencies
                        $data['cycles'] = $analysisData.cycles
                    }
                    'performance' {
                        $data['hotspots'] = $analysisData.performance.hotspots
                        $data['recommendations'] = $analysisData.performance.recommendations
                    }
                    'security' {
                        $data['vulnerabilities'] = $analysisData.security.vulnerabilities
                        $data['risks'] = $analysisData.security.risks
                    }
                    'refactoring' {
                        $data['recommendations'] = $analysisData.refactoring
                        $data['complexity'] = $analysisData.metrics.complexity
                    }
                }
                
                $outputContent = Format-Template -Template $template -Data $data
                $outputPath = Join-Path $outputDir "$type-analysis.md"
                Set-Content -Path $outputPath -Value $outputContent
                
                Write-StructuredLog -Message "Generated $type analysis visualization" -Level INFO -Properties @{
                    outputPath = $outputPath
                    template = $templateKey
                }
            }
            
            # Generate additional visualizations based on format
            switch ($Format) {
                'mermaid' { 
                    Export-MermaidDiagram -AnalysisData $analysisData -OutputPath $outputDir
                }
                'd3' {
                    Export-D3Visualization -AnalysisData $analysisData -OutputPath $outputDir
                }
                'graphviz' {
                    Export-GraphvizDiagram -AnalysisData $analysisData -OutputPath $outputDir
                }
            }
        }
        catch {
            Write-ErrorLog -ErrorRecord $_
            throw
        }
    }
    
    end {
        Stop-ScriptLogging -ScriptName 'Export-CodeVisualization' -Status 'Completed'
    }
}

Export-ModuleMember -Function Export-CodeVisualization
