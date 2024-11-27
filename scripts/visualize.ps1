# PowerShell script to visualize analysis results
param (
    [Parameter(Mandatory=$false)]
    [string]$resultsDir = "../docs/analysis/results",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("mermaid", "d3", "graphviz")]
    [string]$format = "mermaid",
    
    [Parameter(Mandatory=$false)]
    [switch]$openInBrowser
)

$ErrorActionPreference = "Stop"
$outputDir = "../docs/analysis/visualizations"

# Ensure output directory exists
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

# Load metrics and dependency data
$analysisData = Get-Content "$resultsDir/analysis-data.json" | ConvertFrom-Json

# Generate Mermaid diagram
function New-MermaidDiagram {
    $diagram = @"
graph TD
    classDef pattern fill:#f9f,stroke:#333,stroke-width:2px;
    classDef component fill:#bbf,stroke:#333,stroke-width:2px;
    classDef issue fill:#fbb,stroke:#333,stroke-width:2px;
    
    %% Components and their relationships
    subgraph Components
"@
    
    # Add component nodes
    $analysisData.components.index | ForEach-Object {
        $component = $_
        $diagram += "    $($component.Replace('-', '_'))[$component]:::component`n"
    }
    
    # Add component relationships
    $analysisData.components.relationships.dependencies.Keys | ForEach-Object {
        $source = $_
        $analysisData.components.relationships.dependencies[$source].Keys | ForEach-Object {
            $target = $_
            $weight = $analysisData.components.relationships.dependencies[$source][$target]
            $diagram += "    $($source.Replace('-', '_')) -->|$weight| $($target.Replace('-', '_'))`n"
        }
    }
    
    $diagram += @"
    end
    
    %% Patterns and their usage
    subgraph Patterns
"@
    
    # Add pattern nodes
    $analysisData.patterns.index | ForEach-Object {
        $pattern = $_
        $usage = $analysisData.patterns.usage.frequency[$pattern]
        $effectiveness = $analysisData.patterns.usage.effectiveness[$pattern]
        $score = [math]::Round(($effectiveness.avg_coverage * (1 - ($effectiveness.avg_complexity / 100))), 2)
        $diagram += "    pattern_$($pattern.Replace('-', '_'))[$pattern`nUsage: $usage`nScore: $score]:::pattern`n"
    }
    
    # Add pattern relationships to components
    $analysisData.patterns.usage.components.Keys | ForEach-Object {
        $pattern = $_
        $analysisData.patterns.usage.components[$pattern] | ForEach-Object {
            $component = $_
            $diagram += "    pattern_$($pattern.Replace('-', '_')) -.-> $($component.Replace('-', '_'))`n"
        }
    }
    
    $diagram += @"
    end
    
    %% Issues and Technical Debt
    subgraph Issues
"@
    
    # Add issue nodes
    $issueId = 0
    @($analysisData.summary.tech_debt.high + $analysisData.summary.tech_debt.medium) | ForEach-Object {
        $issue = $_
        $issueId++
        $diagram += "    issue_${issueId}[$($issue.issue.type)`n$($issue.issue.message)]:::issue`n"
        $diagram += "    issue_${issueId} -.-> $($issue.file.Replace('/', '_').Replace('-', '_'))`n"
    }
    
    $diagram += "end"
    
    return $diagram
}

# Generate D3 visualization
function New-D3Visualization {
    $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>Code Analysis Visualization</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3-force-boundary@0.0.3/dist/d3-force-boundary.min.js"></script>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        #visualization { width: 100vw; height: 100vh; }
        .node { cursor: pointer; }
        .link { stroke: #999; stroke-opacity: 0.6; }
        .label { font-size: 12px; }
        .tooltip {
            position: absolute;
            padding: 10px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            pointer-events: none;
            opacity: 0;
        }
        .controls {
            position: fixed;
            top: 10px;
            left: 10px;
            background: white;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="controls">
        <label>
            <input type="checkbox" id="showComponents" checked> Show Components
        </label><br>
        <label>
            <input type="checkbox" id="showPatterns" checked> Show Patterns
        </label><br>
        <label>
            <input type="checkbox" id="showIssues" checked> Show Issues
        </label>
    </div>
    <div class="tooltip"></div>
    <div id="visualization"></div>
    <script>
        const data = {
            nodes: $(($analysisData | ConvertTo-Json -Depth 10)),
            patterns: $(($analysisData.patterns | ConvertTo-Json -Depth 10)),
            components: $(($analysisData.components | ConvertTo-Json -Depth 10))
        };
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        
        const svg = d3.select('#visualization')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        const tooltip = d3.select('.tooltip');
        
        // Create force simulation
        const simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('boundary', forceBoundary(0, 0, width, height));
            
        // Draw network
        function updateNetwork() {
            // Clear previous network
            svg.selectAll('*').remove();
            
            // Prepare data based on filters
            const showComponents = d3.select('#showComponents').property('checked');
            const showPatterns = d3.select('#showPatterns').property('checked');
            const showIssues = d3.select('#showIssues').property('checked');
            
            let nodes = [];
            let links = [];
            
            // Add components
            if (showComponents) {
                data.components.index.forEach(component => {
                    nodes.push({ id: component, type: 'component' });
                });
                
                // Add component relationships
                Object.entries(data.components.relationships.dependencies).forEach(([source, targets]) => {
                    Object.entries(targets).forEach(([target, weight]) => {
                        links.push({ source, target, weight });
                    });
                });
            }
            
            // Add patterns
            if (showPatterns) {
                data.patterns.index.forEach(pattern => {
                    nodes.push({ 
                        id: pattern,
                        type: 'pattern',
                        usage: data.patterns.usage.frequency[pattern],
                        effectiveness: data.patterns.usage.effectiveness[pattern]
                    });
                    
                    // Link patterns to components
                    if (showComponents && data.patterns.usage.components[pattern]) {
                        data.patterns.usage.components[pattern].forEach(component => {
                            links.push({ source: pattern, target: component, type: 'usage' });
                        });
                    }
                });
            }
            
            // Add issues
            if (showIssues) {
                let issueId = 0;
                [...data.summary.tech_debt.high, ...data.summary.tech_debt.medium].forEach(issue => {
                    const id = `issue_${++issueId}`;
                    nodes.push({
                        id,
                        type: 'issue',
                        message: issue.issue.message,
                        severity: issue.issue.severity
                    });
                    
                    if (showComponents) {
                        links.push({ source: id, target: issue.file, type: 'issue' });
                    }
                });
            }
            
            // Create elements
            const link = svg.append('g')
                .selectAll('line')
                .data(links)
                .join('line')
                .attr('class', 'link')
                .attr('stroke-width', d => d.weight ? Math.sqrt(d.weight) : 1)
                .attr('stroke-dasharray', d => d.type === 'usage' ? '5,5' : null);
                
            const node = svg.append('g')
                .selectAll('circle')
                .data(nodes)
                .join('circle')
                .attr('class', 'node')
                .attr('r', d => {
                    if (d.type === 'pattern') return Math.sqrt(d.usage || 1) * 5;
                    if (d.type === 'issue') return 8;
                    return 10;
                })
                .attr('fill', d => {
                    if (d.type === 'pattern') return '#f9f';
                    if (d.type === 'issue') return d.severity === 'high' ? '#f55' : '#fa5';
                    return '#bbf';
                })
                .call(drag(simulation));
                
            const label = svg.append('g')
                .selectAll('text')
                .data(nodes)
                .join('text')
                .attr('class', 'label')
                .text(d => d.id)
                .attr('x', 12)
                .attr('y', 3);
                
            // Add tooltips
            node.on('mouseover', function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                    
                let html = `<strong>${d.id}</strong><br>`;
                if (d.type === 'pattern') {
                    html += `Usage: ${d.usage}<br>`;
                    if (d.effectiveness) {
                        html += `Complexity: ${d.effectiveness.avg_complexity.toFixed(2)}<br>`;
                        html += `Coverage: ${d.effectiveness.avg_coverage.toFixed(2)}%<br>`;
                    }
                } else if (d.type === 'issue') {
                    html += `${d.message}<br>`;
                    html += `Severity: ${d.severity}`;
                }
                
                tooltip.html(html)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });
            
            // Update simulation
            simulation
                .nodes(nodes)
                .on('tick', () => {
                    link
                        .attr('x1', d => d.source.x)
                        .attr('y1', d => d.source.y)
                        .attr('x2', d => d.target.x)
                        .attr('y2', d => d.target.y);
                        
                    node
                        .attr('cx', d => d.x)
                        .attr('cy', d => d.y);
                        
                    label
                        .attr('x', d => d.x + 12)
                        .attr('y', d => d.y + 3);
                });
                
            simulation.force('link').links(links);
            simulation.alpha(1).restart();
        }
        
        // Drag functions
        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            
            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
            
            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
            
            return d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }
        
        // Initial render
        updateNetwork();
        
        // Update on filter change
        d3.selectAll('input[type="checkbox"]').on('change', updateNetwork);
    </script>
</body>
</html>
"@
    
    return $html
}

# Generate visualizations
try {
    Write-Host "Generating visualizations..."
    
    switch ($format) {
        "mermaid" {
            $diagram = New-MermaidDiagram
            $diagram | Out-File "$outputDir/dependencies.mmd"
            Write-Host "Generated Mermaid diagram: $outputDir/dependencies.mmd"
        }
        "d3" {
            $html = New-D3Visualization
            $html | Out-File "$outputDir/visualization.html"
            Write-Host "Generated D3 visualization: $outputDir/visualization.html"
            
            if ($openInBrowser) {
                Start-Process "$outputDir/visualization.html"
            }
        }
        "graphviz" {
            # Generate Graphviz diagram
            function New-GraphvizDiagram {
                $dot = @"
digraph CodeAnalysis {
                    node [style=filled];
                    
"@
                
                # Add nodes
                $analysisData.components.index | ForEach-Object {
                    $component = $_
                    $dot += "    `"$component`" [fillcolor=blue]`n"
                }
                
                # Add relationships
                $analysisData.components.relationships.dependencies.Keys | ForEach-Object {
                    $source = $_
                    $analysisData.components.relationships.dependencies[$source].Keys | ForEach-Object {
                        $target = $_
                        $dot += "    `"$source`" -> `"$target`"`n"
                    }
                }
                
                $dot += "}"
                
                return $dot
            }
            
            $dot = New-GraphvizDiagram
            $dot | Out-File "$outputDir/dependencies.dot"
            Write-Host "Generated Graphviz diagram: $outputDir/dependencies.dot"
            
            # If Graphviz is installed, generate PNG
            if (Get-Command "dot" -ErrorAction SilentlyContinue) {
                dot -Tpng -o "$outputDir/dependencies.png" "$outputDir/dependencies.dot"
                Write-Host "Generated PNG visualization: $outputDir/dependencies.png"
            }
        }
    }
    
    Write-Host "Visualization complete!"
}
catch {
    Write-Error "Failed to generate visualization: $_"
    exit 1
}
