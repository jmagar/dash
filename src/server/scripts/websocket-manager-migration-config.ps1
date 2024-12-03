# Common configuration for WebSocketManager migration scripts

# Directories to exclude from migration
$excludedDirs = @(
    "node_modules",
    "dist",
    "build",
    "coverage"
)

# File patterns to include in migration
$includePatterns = @(
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
)

# Backup directory for modified files
$backupDir = "migration-backup"

# Import patterns to search for and replace
$importPatterns = @(
    "import\s+{\s*WebSocketManager\s*}",
    "import\s+WebSocketManager\s+from\s+['\"](?!.*utils/websocket/WebSocketManager)[^'\"]+['\"]",
    "require\(['\"].*WebSocketManager['\"]"
)

# Usage patterns to identify WebSocketManager instantiation
$usagePatterns = @(
    "new\s+WebSocketManager",
    "WebSocketManager\(",
    "createWebSocketManager"
)

# Connection management patterns
$connectionPatterns = @(
    "connect\s*\(",
    "disconnect\s*\(",
    "reconnect\s*\(",
    "getConnectionStatus\s*\(",
    "setConnectionTimeout\s*\("
)

# Message handling patterns
$messagePatterns = @(
    "send\s*\(",
    "broadcast\s*\(",
    "subscribe\s*\(",
    "unsubscribe\s*\(",
    "publish\s*\("
)

# Event handling patterns
$eventPatterns = @(
    "onMessage\s*\(",
    "onConnect\s*\(",
    "onDisconnect\s*\(",
    "onError\s*\(",
    "onReconnect\s*\("
)

# Room management patterns
$roomPatterns = @(
    "joinRoom\s*\(",
    "leaveRoom\s*\(",
    "getRoomMembers\s*\(",
    "sendToRoom\s*\(",
    "broadcastToRoom\s*\("
)

# Security management patterns
$securityPatterns = @(
    "setAuthToken\s*\(",
    "authenticate\s*\(",
    "setSecurityOptions\s*\(",
    "validateConnection\s*\(",
    "revokeToken\s*\("
)

# Client management patterns
$clientPatterns = @(
    "registerClient\s*\(",
    "unregisterClient\s*\(",
    "getClientInfo\s*\(",
    "setClientData\s*\(",
    "getConnectedClients\s*\("
)

# Monitoring patterns
$monitoringPatterns = @(
    "getStats",
    "getMetrics",
    "getConnectionCount",
    "getRoomCount",
    "getClientCount",
    "getMessageCount"
)

function Should-ExcludeDirectory {
    param (
        [string]$dirPath
    )
    
    $dirName = Split-Path $dirPath -Leaf
    return $excludedDirs -contains $dirName
}

function Should-MigrateWebSocket {
    param (
        [string]$content
    )
    
    # Check if the content contains any WebSocket-related patterns
    $patterns = @(
        "WebSocket",
        "ws://",
        "wss://",
        "socket\.",
        "websocket",
        "connection",
        "onmessage",
        "onclose",
        "onopen",
        "onerror",
        "emit",
        "broadcast",
        "subscribe",
        "publish"
    )
    
    foreach ($pattern in $patterns) {
        if ($content -match $pattern) {
            return $true
        }
    }
    return $false
}

function Get-WebSocketManagerImportPath {
    param (
        [string]$currentFile,
        [string]$webSocketManagerPath
    )
    
    $currentDir = Split-Path $currentFile -Parent
    $relPath = Resolve-Path -Relative -Path $webSocketManagerPath -BasePath $currentDir
    $relPath = $relPath -replace '\\', '/'
    if ($relPath.StartsWith("./")) {
        $relPath = $relPath.Substring(2)
    }
    return $relPath
}

# Export functions and variables
Export-ModuleMember -Function @(
    'Should-ExcludeDirectory',
    'Should-MigrateWebSocket',
    'Get-WebSocketManagerImportPath'
) -Variable @(
    'excludedDirs',
    'includePatterns',
    'backupDir',
    'importPatterns',
    'usagePatterns',
    'connectionPatterns',
    'messagePatterns',
    'roomPatterns',
    'clientPatterns',
    'eventPatterns',
    'securityPatterns',
    'monitoringPatterns'
)
