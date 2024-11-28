using namespace System.Collections.Generic

function Export-MermaidDiagram {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$AnalysisData,
        [Parameter(Mandatory)]
        [string]$OutputPath
    )
    
    try {
        $mermaidPath = Join-Path $OutputPath "dependencies.mmd"
        $mermaidContent = @"
graph TD
    %% Code Dependencies Graph
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef warning fill:#fff3cd,stroke:#856404,stroke-width:2px;
    classDef danger fill:#f8d7da,stroke:#721c24,stroke-width:2px;

"@
        
        # Add component nodes
        foreach ($file in $AnalysisData.Values) {
            $safeId = $file.file.Replace('-', '_').Replace('.', '_')
            $metrics = $file.metrics
            $class = if ($metrics.complexity -gt 30) { ':::danger' }
                    elseif ($metrics.complexity -gt 15) { ':::warning' }
                    else { '' }
            $mermaidContent += "    $safeId[$($file.file)]$class`n"
        }

        # Add dependencies
        foreach ($file in $AnalysisData.Values) {
            $sourceId = $file.file.Replace('-', '_').Replace('.', '_')
            foreach ($dep in $file.dependencies) {
                $targetId = $dep.Replace('-', '_').Replace('.', '_')
                $mermaidContent += "    $sourceId --> $targetId`n"
            }
        }

        Set-Content -Path $mermaidPath -Value $mermaidContent
        Write-StructuredLog -Message "Generated Mermaid diagram" -Level INFO -Properties @{
            outputPath = $mermaidPath
        }
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        throw
    }
}

function Export-D3Visualization {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$AnalysisData,
        [Parameter(Mandatory)]
        [string]$OutputPath
    )
    
    try {
        $htmlPath = Join-Path $OutputPath "visualization.html"
        $d3Content = @"
<!DOCTYPE html>
<html>
<head>
    <title>Code Analysis Visualization</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        #graph { width: 100vw; height: 100vh; }
        .node { cursor: pointer; }
        .link { stroke: #999; stroke-opacity: 0.6; stroke-width: 1px; }
        .tooltip {
            position: absolute;
            padding: 10px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 5px;
            pointer-events: none;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div id="graph"></div>
    <script>
        const data = {
            nodes: [
                $(foreach ($file in $AnalysisData.Values) {
                    $metrics = $file.metrics
                    $risk = if ($metrics.complexity -gt 30) { 'high' }
                           elseif ($metrics.complexity -gt 15) { 'medium' }
                           else { 'low' }
                    "{
                        id: '$($file.file)',
                        group: '$($file.language)',
                        metrics: {
                            complexity: $($metrics.complexity),
                            functions: $($metrics.functions),
                            loc: $($metrics.loc)
                        },
                        risk: '$risk'
                    },"
                })
            ],
            links: [
                $(foreach ($file in $AnalysisData.Values) {
                    foreach ($dep in $file.dependencies) {
                        "{
                            source: '$($file.file)',
                            target: '$dep',
                            value: 1
                        },"
                    }
                })
            ]
        };

        // Create force simulation
        const width = window.innerWidth;
        const height = window.innerHeight;
        const color = d3.scaleOrdinal(d3.schemeCategory10);

        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const svg = d3.select("#graph")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // Add zoom behavior
        const g = svg.append("g");
        svg.call(d3.zoom()
            .extent([[0, 0], [width, height]])
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            }));

        // Create links
        const link = g.append("g")
            .selectAll("line")
            .data(data.links)
            .join("line")
            .attr("class", "link");

        // Create nodes
        const node = g.append("g")
            .selectAll("circle")
            .data(data.nodes)
            .join("circle")
            .attr("class", "node")
            .attr("r", d => 5 + Math.sqrt(d.metrics.complexity))
            .attr("fill", d => {
                switch(d.risk) {
                    case 'high': return '#dc3545';
                    case 'medium': return '#ffc107';
                    default: return '#28a745';
                }
            })
            .call(drag(simulation));

        // Add tooltips
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        node.on("mouseover", (event, d) => {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`
                <strong>${d.id}</strong><br/>
                Language: ${d.group}<br/>
                Complexity: ${d.metrics.complexity}<br/>
                Functions: ${d.metrics.functions}<br/>
                Lines of Code: ${d.metrics.loc}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

        // Add labels
        const label = g.append("g")
            .selectAll("text")
            .data(data.nodes)
            .join("text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(d => d.id);

        // Update positions
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            label
                .attr("x", d => d.x)
                .attr("y", d => d.y);
        });

        // Drag behavior
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
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }
    </script>
</body>
</html>
"@

        Set-Content -Path $htmlPath -Value $d3Content
        Write-StructuredLog -Message "Generated D3 visualization" -Level INFO -Properties @{
            outputPath = $htmlPath
        }
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        throw
    }
}

function Export-GraphvizDiagram {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$AnalysisData,
        [Parameter(Mandatory)]
        [string]$OutputPath
    )
    
    try {
        $dotPath = Join-Path $OutputPath "dependencies.dot"
        $pngPath = Join-Path $OutputPath "dependencies.png"
        
        $dotContent = @"
digraph CodeDependencies {
    graph [rankdir=LR, splines=ortho];
    node [shape=box, style=filled, fillcolor=lightgray];

"@
        
        # Add nodes
        foreach ($file in $AnalysisData.Values) {
            $safeId = $file.file.Replace('-', '_').Replace('.', '_')
            $metrics = $file.metrics
            $color = if ($metrics.complexity -gt 30) { 'red' }
                    elseif ($metrics.complexity -gt 15) { 'yellow' }
                    else { 'lightgreen' }
            $label = "{$($file.file)|{complexity: $($metrics.complexity)|functions: $($metrics.functions)}}"
            $dotContent += "    $safeId [label=""$label"", fillcolor=""$color""]`n"
        }

        # Add edges
        foreach ($file in $AnalysisData.Values) {
            $sourceId = $file.file.Replace('-', '_').Replace('.', '_')
            foreach ($dep in $file.dependencies) {
                $targetId = $dep.Replace('-', '_').Replace('.', '_')
                $dotContent += "    $sourceId -> $targetId;`n"
            }
        }

        $dotContent += "}`n"
        Set-Content -Path $dotPath -Value $dotContent
        Write-StructuredLog -Message "Generated DOT file" -Level INFO -Properties @{
            outputPath = $dotPath
        }

        # Try to generate PNG if Graphviz is installed
        try {
            $dot = Get-Command "dot" -ErrorAction Stop
            & $dot -Tpng -o $pngPath $dotPath
            Write-StructuredLog -Message "Generated PNG visualization" -Level INFO -Properties @{
                outputPath = $pngPath
            }
        }
        catch {
            Write-StructuredLog -Message "Graphviz not found. Install Graphviz to generate PNG output." -Level WARN
        }
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        throw
    }
}

Export-ModuleMember -Function Export-MermaidDiagram, Export-D3Visualization, Export-GraphvizDiagram
