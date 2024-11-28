using namespace System.Collections.Generic
using namespace System.IO
using namespace System.Text.Json
using namespace System.Collections.Concurrent
using namespace System.Management.Automation.Language

# Import configuration from JSON
$script:MLConfig = Get-Content "$PSScriptRoot/../Config/ml.json" | ConvertFrom-Json

# Ensure paths are absolute
$script:MLConfig.modelPath = Join-Path $PSScriptRoot $script:MLConfig.modelPath
$script:MLConfig.vectorPath = Join-Path $PSScriptRoot $script:MLConfig.vectorPath
$script:MLConfig.trainingPath = Join-Path $PSScriptRoot $script:MLConfig.trainingPath
$script:MLConfig.python.envPath = Join-Path $PSScriptRoot $script:MLConfig.python.envPath
$script:MLConfig.python.requirementsFile = Join-Path $PSScriptRoot $script:MLConfig.python.requirementsFile

# Import modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1
. $PSScriptRoot/DataManagement.ps1

$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

function New-MLResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$ModelType,
        [Parameter()]
        [string]$Identifier = ""
    )
    
    return @{
        metadata = @{
            operation = $Operation
            model_type = $ModelType
            identifier = $Identifier
            timestamp = Get-Date -Format "o"
            version = "1.0"
            start_time = $null
            end_time = $null
        }
        model = @{
            type = $ModelType
            name = ""
            version = ""
            framework = ""
            parameters = @{}
        }
        prediction = @{
            confidence = 0.0
            labels = @()
            scores = @()
            threshold = 0.0
        }
        metrics = @{
            duration_ms = 0
            memory_mb = 0
            items_processed = 0
            batch_size = 0
        }
        resources = @{
            cpu_percent = 0
            memory_percent = 0
            gpu_utilization = 0
            threads = 0
            start_usage = $null
            end_usage = $null
        }
        status = @{
            success = $true
            initialized = $false
            warnings = @()
            errors = @()
        }
    }
}

function Initialize-PythonEnvironment {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Initializing Python environment" -Level INFO
        $startTime = Get-Date
        
        $result = New-MLResult -Operation "initialize" -ModelType "environment"
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Check Python installation
        $pythonPath = Get-Command python -ErrorAction SilentlyContinue
        if (-not $pythonPath) {
            throw "Python not found in PATH"
        }
        
        # Check required packages
        $requiredPackages = @(
            "numpy",
            "pandas",
            "scikit-learn",
            "torch"
        )
        
        $installedPackages = python -m pip list 2>$null
        foreach ($package in $requiredPackages) {
            if ($installedPackages -notmatch $package) {
                $result.status.warnings += "Package not found: $package"
            }
        }
        
        # Initialize Python process
        $pythonScript = @"
import sys
import json
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator
import torch

print(json.dumps({
    'python_version': sys.version,
    'numpy_version': np.__version__,
    'pandas_version': pd.__version__,
    'torch_version': torch.__version__,
    'cuda_available': torch.cuda.is_available()
}))
"@
        
        $envInfo = python -c $pythonScript | ConvertFrom-Json
        
        $result.model = @{
            type = "environment"
            name = "python"
            version = $envInfo.python_version
            framework = "mixed"
            parameters = @{
                numpy_version = $envInfo.numpy_version
                pandas_version = $envInfo.pandas_version
                torch_version = $envInfo.torch_version
                cuda_available = $envInfo.cuda_available
            }
        }
        
        $result.status.initialized = $true
        $result.metadata.end_time = (Get-Date).ToString("o")
        $result.metrics.duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
        
        Write-StructuredLog -Message "Python environment initialized" -Level INFO -Properties @{
            python_version = $envInfo.python_version
            cuda_available = $envInfo.cuda_available
            duration_ms = $result.metrics.duration_ms
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to initialize Python environment: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        $result.metadata.end_time = (Get-Date).ToString("o")
        return $result
    }
}

function Invoke-MLPrediction {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ModelPath,
        [Parameter(Mandatory)]
        [object]$InputData,
        [Parameter()]
        [hashtable]$Parameters = @{}
    )
    
    try {
        Write-StructuredLog -Message "Running ML prediction" -Level INFO
        $startTime = Get-Date
        
        $result = New-MLResult -Operation "predict" -ModelType "classifier"
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Validate model exists
        if (-not (Test-Path $ModelPath)) {
            throw "Model file not found: $ModelPath"
        }
        
        # Prepare input data
        $inputJson = $InputData | ConvertTo-Json -Depth 10 -Compress
        
        # Run prediction script
        $pythonScript = @"
import sys
import json
import torch
import numpy as np
from time import time
import psutil

def load_model(path):
    return torch.load(path)

def preprocess_input(data):
    # Add your preprocessing logic here
    return np.array(data)

def get_resource_usage():
    process = psutil.Process()
    return {
        'cpu_percent': process.cpu_percent(),
        'memory_percent': process.memory_percent(),
        'threads': process.num_threads()
    }

try:
    # Load input data
    input_data = json.loads('''$inputJson''')
    
    # Track resources
    start_time = time()
    start_resources = get_resource_usage()
    
    # Load model and make prediction
    model = load_model('$ModelPath')
    processed_input = preprocess_input(input_data)
    
    with torch.no_grad():
        output = model(torch.tensor(processed_input))
        probabilities = torch.nn.functional.softmax(output, dim=1)
    
    # Get predictions
    predictions = probabilities.numpy()
    
    # Track final resources
    end_resources = get_resource_usage()
    duration = (time() - start_time) * 1000  # ms
    
    # Prepare result
    result = {
        'predictions': predictions.tolist(),
        'duration_ms': duration,
        'resources': {
            'start': start_resources,
            'end': end_resources
        }
    }
    
    print(json.dumps(result))
    sys.exit(0)
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
"@
        
        $predictionOutput = python -c $pythonScript | ConvertFrom-Json
        
        if ($predictionOutput.error) {
            throw $predictionOutput.error
        }
        
        # Update result with prediction data
        $result.prediction = @{
            confidence = ($predictionOutput.predictions | Measure-Object -Maximum).Maximum
            scores = $predictionOutput.predictions
            threshold = $Parameters.threshold ?? 0.5
            labels = @()  # Add label mapping if available
        }
        
        # Update metrics and timing
        $result.metadata.end_time = (Get-Date).ToString("o")
        $result.metrics = @{
            duration_ms = $predictionOutput.duration_ms
            memory_mb = [Math]::Round(($predictionOutput.resources.end.memory_percent * (Get-Process -Id $PID).WorkingSet64 / 1MB), 2)
            items_processed = 1
            batch_size = 1
        }
        
        # Update resource usage with start and end metrics
        $result.resources = @{
            cpu_percent = $predictionOutput.resources.end.cpu_percent
            memory_percent = $predictionOutput.resources.end.memory_percent
            gpu_utilization = 0  # Add GPU tracking if needed
            threads = $predictionOutput.resources.end.threads
            start_usage = $predictionOutput.resources.start
            end_usage = $predictionOutput.resources.end
        }
        
        Write-StructuredLog -Message "ML prediction completed" -Level INFO -Properties @{
            duration_ms = $result.metrics.duration_ms
            confidence = $result.prediction.confidence
            cpu_percent = $result.resources.cpu_percent
            memory_mb = $result.metrics.memory_mb
            total_duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to run ML prediction: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        $result.metadata.end_time = (Get-Date).ToString("o")
        return $result
    }
}

Export-ModuleMember -Function Initialize-PythonEnvironment, Invoke-MLPrediction
