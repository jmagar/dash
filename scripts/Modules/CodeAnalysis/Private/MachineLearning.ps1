using namespace System.Collections.Generic
using namespace System.IO
using namespace System.Text.Json

# Import Logging module
. $PSScriptRoot/Logging.ps1

# ML Configuration
$script:MLConfig = @{
    ModelPath = Join-Path $PSScriptRoot "../Data/Models"
    VectorPath = Join-Path $PSScriptRoot "../Data/Vectors"
    TrainingPath = Join-Path $PSScriptRoot "../Data/Training"
    MinSamplesForTraining = 100
    UpdateInterval = [TimeSpan]::FromHours(24)
    Embeddings = @{
        ModelName = "all-MiniLM-L6-v2"
        MaxTokens = 512
        BatchSize = 32
    }
}

# Initialize Python environment for ML
function Initialize-MLEnvironment {
    [CmdletBinding()]
    param()
    
    try {
        Write-StructuredLog -Message "Initializing ML environment" -Level INFO
        
        # Ensure Python environment exists
        $pythonPath = Join-Path $PSScriptRoot "../env/python"
        if (-not (Test-Path $pythonPath)) {
            Write-StructuredLog -Message "Creating Python virtual environment" -Level INFO
            
            # Create virtual environment
            $process = Start-Process -FilePath "python" -ArgumentList "-m", "venv", $pythonPath -Wait -PassThru
            if ($process.ExitCode -ne 0) {
                throw "Failed to create virtual environment"
            }
            
            # Install required packages
            $packages = @(
                "torch",
                "transformers",
                "sentence-transformers",
                "scikit-learn",
                "numpy",
                "pandas"
            )
            
            foreach ($package in $packages) {
                Write-StructuredLog -Message "Installing package: $package" -Level INFO
                $process = Start-Process -FilePath "$pythonPath/Scripts/pip" -ArgumentList "install", $package -Wait -PassThru
                if ($process.ExitCode -ne 0) {
                    throw "Failed to install package: $package"
                }
            }
        }
        
        # Create model directories
        $directories = @(
            $script:MLConfig.ModelPath,
            $script:MLConfig.VectorPath,
            $script:MLConfig.TrainingPath
        )
        
        foreach ($dir in $directories) {
            if (-not (Test-Path $dir)) {
                New-Item -Path $dir -ItemType Directory -Force | Out-Null
            }
        }
        
        Write-StructuredLog -Message "ML environment initialized successfully" -Level INFO
        return $true
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        return $false
    }
}

function Get-CodeEmbedding {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Code,
        [Parameter()]
        [string]$ModelName = $script:MLConfig.Embeddings.ModelName
    )
    
    try {
        # Check cache first
        $cacheKey = [System.BitConverter]::ToString(
            [System.Security.Cryptography.SHA256]::Create().ComputeHash(
                [System.Text.Encoding]::UTF8.GetBytes($Code)
            )
        ).Replace("-", "")
        
        $cached = Get-FromCache -CacheType 'Pattern' -Key $cacheKey
        if ($cached) { return $cached }
        
        # Generate embedding using Python
        $pythonScript = @"
from sentence_transformers import SentenceTransformer
import torch
import sys
import json

def get_embedding(text, model_name):
    model = SentenceTransformer(model_name)
    with torch.no_grad():
        embedding = model.encode(text)
    return embedding.tolist()

code = sys.argv[1]
model_name = sys.argv[2]
embedding = get_embedding(code, model_name)
print(json.dumps(embedding))
"@
        
        $tempScript = [Path]::GetTempFileName()
        $pythonScript | Set-Content $tempScript
        
        $pythonPath = Join-Path $PSScriptRoot "../env/python/Scripts/python"
        $process = Start-Process -FilePath $pythonPath -ArgumentList $tempScript, $Code, $ModelName -Wait -PassThru -RedirectStandardOutput ([Path]::GetTempFileName())
        
        if ($process.ExitCode -ne 0) {
            throw "Failed to generate embedding"
        }
        
        $embedding = Get-Content $process.StandardOutput.Path | ConvertFrom-Json
        
        # Cache the result
        Add-ToCache -CacheType 'Pattern' -Key $cacheKey -Value $embedding
        
        return $embedding
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        return $null
    }
    finally {
        if ($tempScript -and (Test-Path $tempScript)) {
            Remove-Item $tempScript -Force
        }
    }
}

function Update-MLModel {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$ModelType = 'pattern',
        [Parameter()]
        [string]$ModelName = $script:MLConfig.Embeddings.ModelName
    )
    
    try {
        Write-StructuredLog -Message "Updating ML model" -Level INFO -Properties @{
            modelType = $ModelType
            modelName = $ModelName
        }
        
        # Check if we have enough training data
        $trainingPath = Join-Path $script:MLConfig.TrainingPath $ModelType
        $trainingFiles = Get-ChildItem $trainingPath -Filter "*.json" -File
        
        if ($trainingFiles.Count -lt $script:MLConfig.MinSamplesForTraining) {
            Write-StructuredLog -Message "Insufficient training data" -Level WARN -Properties @{
                samplesNeeded = $script:MLConfig.MinSamplesForTraining
                samplesAvailable = $trainingFiles.Count
            }
            return $false
        }
        
        # Prepare training data
        $trainingData = foreach ($file in $trainingFiles) {
            Get-Content $file.FullName -Raw | ConvertFrom-Json
        }
        
        # Train model using Python
        $pythonScript = @"
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader
import torch
import json
import sys

def train_model(data, model_name, output_path):
    model = SentenceTransformer(model_name)
    
    # Prepare training examples
    train_examples = [
        InputExample(texts=[d['input']], label=d['label'])
        for d in data
    ]
    
    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)
    train_loss = losses.CosineSimilarityLoss(model)
    
    # Train the model
    model.fit(train_dataloader=train_dataloader,
              epochs=1,
              warmup_steps=100,
              show_progress_bar=True)
    
    # Save the model
    model.save(output_path)
    return True

data = json.loads(sys.argv[1])
model_name = sys.argv[2]
output_path = sys.argv[3]

success = train_model(data, model_name, output_path)
print(json.dumps({'success': success}))
"@
        
        $tempScript = [Path]::GetTempFileName()
        $pythonScript | Set-Content $tempScript
        
        $modelPath = Join-Path $script:MLConfig.ModelPath "$ModelType-$([DateTime]::Now.ToString('yyyyMMdd'))"
        $pythonPath = Join-Path $PSScriptRoot "../env/python/Scripts/python"
        
        $process = Start-Process -FilePath $pythonPath -ArgumentList @(
            $tempScript,
            ($trainingData | ConvertTo-Json -Compress),
            $ModelName,
            $modelPath
        ) -Wait -PassThru -RedirectStandardOutput ([Path]::GetTempFileName())
        
        if ($process.ExitCode -ne 0) {
            throw "Failed to train model"
        }
        
        $result = Get-Content $process.StandardOutput.Path | ConvertFrom-Json
        
        Write-StructuredLog -Message "Model training completed" -Level INFO -Properties @{
            modelPath = $modelPath
            success = $result.success
        }
        
        return $result.success
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        return $false
    }
    finally {
        if ($tempScript -and (Test-Path $tempScript)) {
            Remove-Item $tempScript -Force
        }
    }
}

function Add-TrainingData {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ModelType,
        [Parameter(Mandatory)]
        [object]$InputData,
        [Parameter(Mandatory)]
        [object]$Label
    )
    
    try {
        $trainingPath = Join-Path $script:MLConfig.TrainingPath $ModelType
        if (-not (Test-Path $trainingPath)) {
            New-Item -Path $trainingPath -ItemType Directory -Force | Out-Null
        }
        
        $trainingItem = @{
            timestamp = [DateTime]::UtcNow.ToString('o')
            input = $InputData
            label = $Label
        }
        
        $fileName = [guid]::NewGuid().ToString() + ".json"
        $filePath = Join-Path $trainingPath $fileName
        
        $trainingItem | ConvertTo-Json -Depth 10 | Set-Content $filePath
        
        Write-StructuredLog -Message "Added training data" -Level INFO -Properties @{
            modelType = $ModelType
            filePath = $filePath
        }
        
        return $true
    }
    catch {
        Write-ErrorLog -ErrorRecord $_
        return $false
    }
}

# Start background model update job
$script:ModelUpdateJob = Start-Job -ScriptBlock {
    param($MLConfig)
    
    while ($true) {
        Start-Sleep -Seconds $MLConfig.UpdateInterval.TotalSeconds
        
        # Update models if needed
        foreach ($modelType in @('pattern', 'security', 'performance')) {
            Update-MLModel -ModelType $modelType
        }
    }
} -ArgumentList $script:MLConfig

# Cleanup on module unload
$ExecutionContext.SessionState.Module.OnRemove = {
    Stop-Job -Job $script:ModelUpdateJob
    Remove-Job -Job $script:ModelUpdateJob
}

Export-ModuleMember -Function Initialize-MLEnvironment, Get-CodeEmbedding, Update-MLModel, Add-TrainingData
