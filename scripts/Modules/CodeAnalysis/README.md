# Code Analysis Module

A PowerShell module for comprehensive code analysis, pattern detection, and visualization.

## Prerequisites

### System Requirements
- Visual C++ Build Tools (required for Python packages)
  - Download from: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  - During installation, select "Desktop development with C++"

### PowerShell Modules
- PSSQLite (for data storage and indexing)
- PSScriptAnalyzer (for PowerShell code analysis)

### Python Environment (for ML-based pattern detection)
- Python 3.8 or higher
- Required packages in requirements.txt:
  - sentence-transformers
  - scikit-learn
  - numpy
  - pandas
  - torch
  - matplotlib
  - seaborn
  - plotly

## Installation

1. Install required PowerShell modules:
```powershell
Install-Module -Name PSSQLite -Scope CurrentUser
Install-Module -Name PSScriptAnalyzer -Scope CurrentUser
```

2. Set up Python environment:
```powershell
# Create virtual environment
python -m venv env

# Activate environment
.\env\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

3. Import the module:
```powershell
Import-Module .\CodeAnalysis.psm1
```

## Configuration

The module uses several configuration files in the `Config` directory:
- `module-config.json`: Main module configuration
- `patterns.json`: Code pattern definitions
- `metrics.json`: Analysis metrics configuration

## Usage

### Basic Analysis
```powershell
Invoke-CodeAnalysis -Path .\YourCodeDirectory
```

### Export Visualizations
```powershell
Export-CodeVisualization -AnalysisResults $results -OutputPath .\visualizations
```

## Directory Structure

- `Public/`: Public module functions
- `Private/`: Internal module functions
- `Config/`: Configuration files
- `Data/`: Generated data and indexes
- `Templates/`: Report and visualization templates
- `Tests/`: Module tests
- `env/`: Python virtual environment
- `logs/`: Module logs

## Features

- Static code analysis
- Pattern detection
- Security scanning
- Complexity metrics
- ML-based pattern prediction
- Code visualization
- Performance monitoring
