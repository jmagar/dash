# Code Analysis Module Documentation

## Overview

The Code Analysis module provides comprehensive static code analysis capabilities with pattern detection, security scanning, and performance optimization features. It uses machine learning for advanced pattern recognition and provides detailed visualizations of analysis results.

## Key Features

- Static code analysis with pattern matching
- Security vulnerability detection and CVSS scoring
- Performance metrics and optimization recommendations
- Machine learning-based pattern detection
- Dependency analysis and visualization
- Directory structure analysis
- Comprehensive refactoring recommendations

## Prerequisites

### System Requirements
- PowerShell 5.1 or later
- Visual C++ Build Tools (for Python packages)
- .NET Framework 4.8 or later

### Required PowerShell Modules
```powershell
Install-Module -Name PSSQLite -Scope CurrentUser
```

### Python Environment (for ML features)
```powershell
# Create virtual environment
python -m venv venv

# Activate environment
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

## Module Structure

```
CodeAnalysis/
├── Public/                      # Public module functions
│   ├── Export-CodeVisualization.ps1
│   └── Invoke-CodeAnalysis.ps1
├── Private/                     # Internal module functions
│   ├── AstAnalysis.ps1         # AST parsing and analysis
│   ├── BackendPatterns.ps1     # Backend-specific patterns
│   ├── Caching.ps1            # Caching mechanisms
│   ├── Configuration.ps1      # Configuration management
│   ├── ContextManagement.ps1  # Analysis context handling
│   ├── DataManagement.ps1     # Data storage and retrieval
│   ├── Export-Visualizations.ps1
│   ├── Indexing.ps1          # Code indexing
│   ├── Logging.ps1           # Structured logging
│   ├── MachineLearning.ps1   # ML integration
│   ├── Patterns.ps1          # Pattern detection
│   ├── Performance.ps1       # Performance analysis
│   └── Security.ps1          # Security scanning
├── Config/                     # Configuration files
│   ├── metrics.json          # Metric thresholds
│   ├── ml.json              # ML settings
│   ├── module-config.json   # Core configuration
│   └── patterns.json        # Pattern definitions
├── Templates/                  # Analysis report templates
│   └── Analysis/
│       ├── component-analysis.md
│       ├── dependency-analysis.md
│       ├── directory-analysis.md
│       ├── performance-analysis.md
│       ├── refactoring-recommendations.md
│       └── security-analysis.md
├── Output/                     # Analysis output
│   ├── cache/                # Cache storage
│   ├── data/                 # Analysis data
│   ├── logs/                 # Log files
│   ├── models/               # ML models
│   └── visualization/        # Generated visualizations
└── docs/                      # Documentation
```

## Usage Examples

### Basic Code Analysis
```powershell
# Analyze a single file
Invoke-CodeAnalysis -Path .\src\MyScript.ps1

# Analyze a directory with specific settings
Invoke-CodeAnalysis -Path .\src `
                   -FileExtensions @('.ps1', '.psm1') `
                   -BatchSize 100 `
                   -MaxParallelism 4 `
                   -IncludeRefactoringSuggestions

# Export analysis visualizations
Export-CodeVisualization -AnalysisName "MyAnalysis" `
                        -Format "mermaid" `
                        -AnalysisTypes @('component', 'dependency')
```

## Configuration

### Core Configuration (module-config.json)
```json
{
    "fileSystem": {
        "outputDirectory": "./Output",
        "maxCacheSize": "1GB",
        "excludePatterns": ["node_modules", "bin", "obj"]
    },
    "resourceManagement": {
        "memoryThreshold": "1GB",
        "batchSize": 100,
        "maxParallelism": 4
    },
    "security": {
        "allowedPaths": ["./Output", "./Config", "./Data"],
        "suspiciousPatterns": ["eval\\(", "exec\\("]
    }
}
```

### Metrics Configuration (metrics.json)
```json
{
    "complexity": {
        "maxAllowed": 15,
        "warning": 10
    },
    "performance": {
        "batchSize": 100,
        "maxParallelism": 4,
        "memoryThreshold": "1GB"
    }
}
```

### ML Configuration (ml.json)
```json
{
    "modelPath": "./Output/models",
    "embeddings": {
        "modelName": "all-MiniLM-L6-v2",
        "maxTokens": 512
    },
    "confidenceThresholds": {
        "high": 0.8,
        "medium": 0.6
    }
}
```

## Analysis Reports

The module generates comprehensive reports in various formats:

### Component Analysis
- Code structure and metrics
- Dependency relationships
- State management
- Performance profile
- Security considerations

### Security Analysis
- Vulnerability detection
- CVSS scoring
- Access control analysis
- Data protection assessment
- Compliance status

### Performance Analysis
- Resource usage metrics
- Optimization opportunities
- Caching effectiveness
- Load time analysis
- Memory profiling

### Dependency Analysis
- Dependency graph
- Version conflicts
- Security vulnerabilities
- Update impact analysis
- License compliance

### Directory Analysis
- Structure metrics
- File distribution
- Code organization
- Resource utilization
- Pattern distribution

### Refactoring Recommendations
- Code improvements
- Implementation steps
- Risk assessment
- Validation steps
- Resource requirements

## Best Practices

### Performance Optimization
- Enable caching for large codebases
- Configure appropriate batch sizes
- Monitor resource usage
- Use parallel processing when appropriate
- Regular cache cleanup

### Security Considerations
- Keep pattern definitions updated
- Regular security scans
- Proper access control
- Secure credential handling
- Audit logging

### Code Analysis
- Regular pattern updates
- Consistent coding standards
- Comprehensive test coverage
- Documentation maintenance
- Regular refactoring

## Troubleshooting

### Common Issues

1. Performance Problems
   - Check system resources
   - Adjust batch size
   - Clear cache
   - Monitor memory usage
   - Review log files

2. Analysis Errors
   - Verify file permissions
   - Check file encodings
   - Validate configurations
   - Review error logs
   - Check dependencies

3. ML-related Issues
   - Verify Python environment
   - Check model availability
   - Validate embeddings
   - Monitor GPU usage
   - Review prediction logs

### Logging

The module uses structured logging with multiple levels:
- DEBUG: Detailed debugging information
- INFO: General operational information
- WARN: Warning messages
- ERROR: Error conditions
- FATAL: Critical failures

Logs are stored in:
- `./Output/logs/code-analysis.log`: Main log file
- `./Output/logs/error.log`: Error-specific log file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Update documentation
6. Submit a pull request

## License

MIT License - See LICENSE file for details
