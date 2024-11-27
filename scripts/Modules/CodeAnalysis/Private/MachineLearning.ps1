# Machine Learning module for pattern analysis and prediction
using namespace System.Collections.Generic
using namespace System.IO
using namespace System.Text.Json

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
        # Ensure Python environment exists
        $pythonPath = Join-Path $PSScriptRoot "../env/python"
        if (-not (Test-Path $pythonPath)) {
            Write-Verbose "Creating Python virtual environment..."
            python -m venv $pythonPath
            
            # Install required packages
            & "$pythonPath/Scripts/pip" install torch transformers sentence-transformers scikit-learn numpy pandas
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
        
        return $true
    }
    catch {
        Write-Error "Failed to initialize ML environment: $_"
        return $false
    }
}

# Convert code patterns to vector embeddings
function Get-PatternEmbeddings {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        
        [Parameter()]
        [string]$Language
    )
    
    try {
        # Use sentence-transformers to get embeddings
        $pythonScript = @"
from sentence_transformers import SentenceTransformer
import torch
import json
import sys

def get_embeddings(text, model_name='$($script:MLConfig.Embeddings.ModelName)'):
    model = SentenceTransformer(model_name)
    embeddings = model.encode(text, convert_to_tensor=True)
    return embeddings.tolist()

content = sys.argv[1]
embeddings = get_embeddings(content)
print(json.dumps(embeddings))
"@
        
        $pythonPath = Join-Path $PSScriptRoot "../env/python/Scripts/python"
        $tempScript = [Path]::GetTempFileName()
        $pythonScript | Set-Content $tempScript
        
        $embeddings = & $pythonPath $tempScript $Content | ConvertFrom-Json
        Remove-Item $tempScript -Force
        
        return $embeddings
    }
    catch {
        Write-Error "Failed to get pattern embeddings: $_"
        return $null
    }
}

# Train pattern recognition model
function Update-PatternModel {
    [CmdletBinding()]
    param(
        [Parameter()]
        [int]$MinSamples = $script:MLConfig.MinSamplesForTraining
    )
    
    try {
        # Get historical pattern data
        $patterns = Search-AnalysisData -MaxResults 1000 | Where-Object {
            $_.patterns -and $_.patterns.Count -gt 0
        }
        
        if ($patterns.Count -lt $MinSamples) {
            Write-Warning "Insufficient samples for training ($($patterns.Count) < $MinSamples)"
            return $false
        }
        
        # Prepare training data
        $trainingData = @()
        foreach ($analysis in $patterns) {
            foreach ($pattern in $analysis.patterns) {
                $trainingData += @{
                    pattern = $pattern.pattern_name
                    context = $pattern.context
                    language = $analysis.language
                    embedding = Get-PatternEmbeddings -Content $pattern.context -Language $analysis.language
                }
            }
        }
        
        # Train classifier using scikit-learn
        $pythonScript = @"
from sklearn.ensemble import RandomForestClassifier
import numpy as np
import pickle
import json
import sys

# Load training data
data = json.loads(sys.argv[1])
X = np.array([d['embedding'] for d in data])
y = np.array([d['pattern'] for d in data])

# Train model
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X, y)

# Save model
with open(sys.argv[2], 'wb') as f:
    pickle.dump(clf, f)
"@
        
        $modelPath = Join-Path $script:MLConfig.ModelPath "pattern_classifier.pkl"
        $tempScript = [Path]::GetTempFileName()
        $pythonScript | Set-Content $tempScript
        
        $pythonPath = Join-Path $PSScriptRoot "../env/python/Scripts/python"
        & $pythonPath $tempScript ($trainingData | ConvertTo-Json -Compress) $modelPath
        Remove-Item $tempScript -Force
        
        # Save training metadata
        $metadata = @{
            timestamp = [DateTime]::UtcNow.ToString('o')
            samples = $patterns.Count
            patterns = @($trainingData | Group-Object pattern | Select-Object Name, Count)
            languages = @($trainingData | Group-Object language | Select-Object Name, Count)
        }
        
        $metadata | ConvertTo-Json | Set-Content (Join-Path $script:MLConfig.ModelPath "metadata.json")
        
        return $true
    }
    catch {
        Write-Error "Failed to update pattern model: $_"
        return $false
    }
}

# Predict patterns in new code
function Get-PredictedPatterns {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        
        [Parameter()]
        [string]$Language,
        
        [Parameter()]
        [double]$Threshold = 0.5
    )
    
    try {
        # Get embeddings for new content
        $embeddings = Get-PatternEmbeddings -Content $Content -Language $Language
        
        # Use model to predict patterns
        $pythonScript = @"
import pickle
import numpy as np
import json
import sys

# Load model
with open(sys.argv[1], 'rb') as f:
    clf = pickle.load(f)

# Get predictions
embeddings = np.array(json.loads(sys.argv[2])).reshape(1, -1)
probabilities = clf.predict_proba(embeddings)[0]
classes = clf.classes_

# Get predictions above threshold
threshold = float(sys.argv[3])
predictions = []
for i, prob in enumerate(probabilities):
    if prob >= threshold:
        predictions.append({
            'pattern': classes[i],
            'confidence': float(prob)
        })

print(json.dumps(predictions))
"@
        
        $modelPath = Join-Path $script:MLConfig.ModelPath "pattern_classifier.pkl"
        if (-not (Test-Path $modelPath)) {
            Write-Warning "No trained model found. Run Update-PatternModel first."
            return @()
        }
        
        $tempScript = [Path]::GetTempFileName()
        $pythonScript | Set-Content $tempScript
        
        $pythonPath = Join-Path $PSScriptRoot "../env/python/Scripts/python"
        $predictions = & $pythonPath $tempScript $modelPath ($embeddings | ConvertTo-Json -Compress) $Threshold |
            ConvertFrom-Json
        
        Remove-Item $tempScript -Force
        
        return $predictions
    }
    catch {
        Write-Error "Failed to predict patterns: $_"
        return @()
    }
}

# Learn from feedback
function Add-PatternFeedback {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Content,
        
        [Parameter(Mandatory)]
        [string]$Pattern,
        
        [Parameter()]
        [string]$Language,
        
        [Parameter()]
        [bool]$IsCorrect
    )
    
    try {
        # Store feedback for next training
        $feedback = @{
            content = $Content
            pattern = $Pattern
            language = $Language
            isCorrect = $IsCorrect
            timestamp = [DateTime]::UtcNow.ToString('o')
        }
        
        $feedbackPath = Join-Path $script:MLConfig.TrainingPath "feedback.jsonl"
        $feedback | ConvertTo-Json -Compress | Add-Content $feedbackPath
        
        # Check if we should retrain
        $lastTraining = Get-Content (Join-Path $script:MLConfig.ModelPath "metadata.json") -Raw |
            ConvertFrom-Json |
            Select-Object @{N='timestamp';E={[DateTime]::Parse($_.timestamp)}}
        
        if ((-not $lastTraining) -or
            ([DateTime]::UtcNow - $lastTraining.timestamp) -gt $script:MLConfig.UpdateInterval) {
            Write-Verbose "Retraining model with new feedback..."
            Update-PatternModel
        }
        
        return $true
    }
    catch {
        Write-Error "Failed to add pattern feedback: $_"
        return $false
    }
}

# Initialize on module load
if (-not (Initialize-MLEnvironment)) {
    Write-Warning "Failed to initialize ML environment. Some features may be unavailable."
}

# Export functions
Export-ModuleMember -Function @(
    'Update-PatternModel',
    'Get-PredictedPatterns',
    'Add-PatternFeedback'
)
