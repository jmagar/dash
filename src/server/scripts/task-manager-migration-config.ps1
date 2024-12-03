# Configuration for TaskManager migration script

# Directories to exclude from migration
$excludedDirs = @(
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage',
    'test',
    'tests',
    'e2e',
    'backup'
)

# Directory for storing backups of modified files
$backupDir = Join-Path $PSScriptRoot "backup"

# Patterns for finding TaskManager imports
$importPatterns = @(
    'import.*TaskManager.*from',
    '@inject\([''"]TaskManager[''"]\)',
    '@Inject\([''"]TaskManager[''"]\)',
    'require\([''"].*TaskManager[''"]\)'
)

# Patterns for finding TaskManager usage
$usagePatterns = @(
    'new\s+TaskManager\s*\(\s*\)',
    '(?<!\.|\w)TaskManager\s*\.\s*(?!getInstance\(\))',
    'private\s+taskManager\s*:\s*TaskManager',
    'protected\s+taskManager\s*:\s*TaskManager',
    'public\s+taskManager\s*:\s*TaskManager'
)

# Patterns for detecting custom task scheduling implementations
$customSchedulingPatterns = @(
    'setInterval\s*\(',
    'setTimeout\s*\(',
    'new\s+CronJob\s*\(',
    'schedule\s*\.\s*scheduleJob',
    '@Cron\s*\(',
    'node-cron',
    'node-schedule'
)

# Patterns for detecting custom error handling and retries
$errorHandlingPatterns = @(
    'retry\s*\(',
    'maxRetries',
    'retryAttempts',
    'backoff',
    'setTimeout\s*\(\s*function\s*\(\s*\)\s*{\s*retry',
    'catch\s*\(\s*.*\s*\)\s*{\s*.*setTimeout'
)

# Patterns for detecting custom timeout implementations
$timeoutPatterns = @(
    'setTimeout\s*\(\s*\(\s*\)\s*=>\s*{.*reject',
    'new\s+Promise\s*\(\s*.*setTimeout',
    'timeout:\s*\d+',
    'timeoutMs',
    'timeoutSeconds'
)

# Patterns for detecting custom task monitoring
$monitoringPatterns = @(
    'console\.log\s*\(\s*[''"]Task',
    'logger\.(info|debug|error)\s*\(\s*[''"]Task',
    'metrics\.(increment|gauge|timing)',
    'performance\.now\s*\(\s*\)',
    'Date\.now\s*\(\s*\)'
)

# Export variables for use in migration script
Export-ModuleMember -Variable @(
    'excludedDirs',
    'backupDir',
    'importPatterns',
    'usagePatterns',
    'customSchedulingPatterns',
    'errorHandlingPatterns',
    'timeoutPatterns',
    'monitoringPatterns'
)
