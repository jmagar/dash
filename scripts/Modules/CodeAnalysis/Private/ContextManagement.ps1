using namespace System.Management.Automation.Language
using namespace System.Collections.Concurrent

# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json
$script:ContextStore = [ConcurrentDictionary[string, object]]::new()

function New-ContextResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$ContextId,
        [Parameter()]
        [hashtable]$Properties = @{}
    )
    
    return @{
        metadata = @{
            operation = $Operation
            context_id = $ContextId
            timestamp = Get-Date -Format "o"
            version = "1.0"
            session_id = $script:Config.SessionId
        }
        context = @{
            properties = $Properties
            parent_id = $null
            children = @()
            depth = 0
            path = @()
        }
        metrics = @{
            duration_ms = 0
            items_processed = 0
            memory_used_mb = 0
        }
        status = @{
            success = $true
            warnings = @()
            errors = @()
        }
    }
}

function New-AnalysisContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ContextId,
        [Parameter()]
        [string]$ParentId,
        [Parameter()]
        [hashtable]$Properties = @{}
    )
    
    try {
        Write-StructuredLog -Message "Creating new analysis context" -Level INFO
        $startTime = Get-Date
        $errorLogPath = Join-Path $PWD "$ContextId.error.log"
        
        $result = New-ContextResult -Operation "create" -ContextId $ContextId -Properties $Properties
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Create context object
        $context = @{
            id = $ContextId
            parent_id = $ParentId
            children = @()
            properties = $Properties
            created = Get-Date
            modified = Get-Date
            depth = 0
            path = @($ContextId)
        }
        
        # Update parent-child relationships
        if ($ParentId -and $script:ContextStore.ContainsKey($ParentId)) {
            $parent = $script:ContextStore[$ParentId]
            $parent.children += $ContextId
            $context.depth = $parent.depth + 1
            $context.path = $parent.path + @($ContextId)
        }
        
        # Store context
        $script:ContextStore[$ContextId] = $context
        
        # Update result
        $result.context = @{
            properties = $context.properties
            parent_id = $context.parent_id
            children = $context.children
            depth = $context.depth
            path = $context.path
        }
        
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = 1
            memory_used_mb = 0
        }
        
        # Update result with timing information
        $result.metadata.end_time = (Get-Date).ToString("o")
        
        # Clean up error log if it exists
        if (Test-Path $errorLogPath) {
            Remove-Item $errorLogPath
        }
        
        Write-StructuredLog -Message "Analysis context created" -Level INFO -Properties @{
            context_id = $ContextId
            parent_id = $ParentId
            depth = $context.depth
            duration_ms = $result.metrics.duration_ms
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to create analysis context: $_" -Level ERROR
        if (Test-Path $errorLogPath) {
            $errorContent = Get-Content $errorLogPath -Raw
            Write-StructuredLog -Message "Error details: $errorContent" -Level ERROR
            Remove-Item $errorLogPath
        }
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        $result.metadata.end_time = (Get-Date).ToString("o")
        return $result
    }
}

function Get-AnalysisContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ContextId
    )
    
    try {
        Write-StructuredLog -Message "Getting analysis context" -Level INFO
        $startTime = Get-Date
        
        $result = New-ContextResult -Operation "get" -ContextId $ContextId
        
        if (-not $script:ContextStore.ContainsKey($ContextId)) {
            $result.status.warnings += "Context not found"
            return $result
        }
        
        $context = $script:ContextStore[$ContextId]
        
        # Update result
        $result.context = @{
            properties = $context.properties
            parent_id = $context.parent_id
            children = $context.children
            depth = $context.depth
            path = $context.path
        }
        
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = 1
            memory_used_mb = 0
        }
        
        Write-StructuredLog -Message "Analysis context retrieved" -Level INFO -Properties @{
            context_id = $ContextId
            parent_id = $context.parent_id
            children_count = $context.children.Count
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to get analysis context: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Update-AnalysisContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ContextId,
        [Parameter()]
        [hashtable]$Properties = @{}
    )
    
    try {
        Write-StructuredLog -Message "Updating analysis context" -Level INFO
        $startTime = Get-Date
        
        $result = New-ContextResult -Operation "update" -ContextId $ContextId -Properties $Properties
        
        if (-not $script:ContextStore.ContainsKey($ContextId)) {
            $result.status.warnings += "Context not found"
            return $result
        }
        
        $context = $script:ContextStore[$ContextId]
        
        # Update properties
        foreach ($key in $Properties.Keys) {
            $context.properties[$key] = $Properties[$key]
        }
        
        $context.modified = Get-Date
        
        # Update result
        $result.context = @{
            properties = $context.properties
            parent_id = $context.parent_id
            children = $context.children
            depth = $context.depth
            path = $context.path
        }
        
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = 1
            memory_used_mb = 0
        }
        
        Write-StructuredLog -Message "Analysis context updated" -Level INFO -Properties @{
            context_id = $ContextId
            updated_properties = $Properties.Keys
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to update analysis context: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Remove-AnalysisContext {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ContextId,
        [Parameter()]
        [switch]$RemoveChildren
    )
    
    try {
        Write-StructuredLog -Message "Removing analysis context" -Level INFO
        $startTime = Get-Date
        
        $result = New-ContextResult -Operation "remove" -ContextId $ContextId
        
        if (-not $script:ContextStore.ContainsKey($ContextId)) {
            $result.status.warnings += "Context not found"
            return $result
        }
        
        $context = $script:ContextStore[$ContextId]
        $removedCount = 0
        
        # Remove from parent's children list
        if ($context.parent_id -and $script:ContextStore.ContainsKey($context.parent_id)) {
            $parent = $script:ContextStore[$context.parent_id]
            $parent.children = $parent.children | Where-Object { $_ -ne $ContextId }
        }
        
        # Remove children if specified
        if ($RemoveChildren) {
            foreach ($childId in $context.children) {
                if ($script:ContextStore.ContainsKey($childId)) {
                    $null = $script:ContextStore.TryRemove($childId, [ref]$null)
                    $removedCount++
                }
            }
        }
        else {
            # Update children's parent reference
            foreach ($childId in $context.children) {
                if ($script:ContextStore.ContainsKey($childId)) {
                    $child = $script:ContextStore[$childId]
                    $child.parent_id = $context.parent_id
                    $child.depth = $child.depth - 1
                    $child.path = $child.path | Where-Object { $_ -ne $ContextId }
                }
            }
        }
        
        # Remove context
        $null = $script:ContextStore.TryRemove($ContextId, [ref]$null)
        $removedCount++
        
        # Update result
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = $removedCount
            memory_used_mb = 0
        }
        
        Write-StructuredLog -Message "Analysis context removed" -Level INFO -Properties @{
            context_id = $ContextId
            removed_count = $removedCount
            removed_children = $RemoveChildren
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to remove analysis context: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Get-ContextHierarchy {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$RootContextId
    )
    
    try {
        Write-StructuredLog -Message "Getting context hierarchy" -Level INFO
        $startTime = Get-Date
        
        $result = New-ContextResult -Operation "hierarchy" -ContextId ($RootContextId ?? "*")
        
        function Get-ContextNode {
            param (
                [Parameter(Mandatory)]
                [string]$ContextId,
                [Parameter()]
                [int]$Depth = 0
            )
            
            if (-not $script:ContextStore.ContainsKey($ContextId)) {
                return $null
            }
            
            $context = $script:ContextStore[$ContextId]
            
            return @{
                id = $ContextId
                properties = $context.properties
                depth = $Depth
                created = $context.created
                modified = $context.modified
                children = $context.children | ForEach-Object {
                    Get-ContextNode -ContextId $_ -Depth ($Depth + 1)
                } | Where-Object { $_ -ne $null }
            }
        }
        
        if ($RootContextId) {
            if (-not $script:ContextStore.ContainsKey($RootContextId)) {
                $result.status.warnings += "Root context not found"
                return $result
            }
            
            $hierarchy = Get-ContextNode -ContextId $RootContextId
        }
        else {
            $hierarchy = $script:ContextStore.Keys | 
                Where-Object { -not $script:ContextStore[$_].parent_id } |
                ForEach-Object {
                    Get-ContextNode -ContextId $_
                }
        }
        
        # Update result
        $result.context = @{
            hierarchy = $hierarchy
        }
        
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            items_processed = $script:ContextStore.Count
            memory_used_mb = 0
        }
        
        Write-StructuredLog -Message "Context hierarchy retrieved" -Level INFO -Properties @{
            root_context_id = $RootContextId
            total_contexts = $script:ContextStore.Count
        }
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to get context hierarchy: $_" -Level ERROR
        $result.status.success = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

Export-ModuleMember -Function New-AnalysisContext, Get-AnalysisContext, Update-AnalysisContext, Remove-AnalysisContext, Get-ContextHierarchy
