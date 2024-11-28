# Import configuration
$script:Config = Get-Content "$PSScriptRoot/../Config/module-config.json" | ConvertFrom-Json

# Import required modules
. $PSScriptRoot/Logging.ps1
. $PSScriptRoot/Configuration.ps1

function New-SecurityResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$Target,
        [Parameter()]
        [hashtable]$Context = @{}
    )
    
    return @{
        metadata = @{
            operation = $Operation
            target = $Target
            timestamp = Get-Date -Format "o"
            version = "1.0"
            session_id = $script:Config.SessionId
        }
        context = $Context
        checks = @{
            permissions = @()
            vulnerabilities = @()
            compliance = @()
        }
        metrics = @{
            duration_ms = 0
            checks_performed = 0
            issues_found = 0
        }
        status = @{
            success = $true
            secure = $true
            warnings = @()
            errors = @()
        }
    }
}

function Test-SecurityPreconditions {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Operation,
        [Parameter(Mandatory)]
        [string]$Target,
        [Parameter()]
        [string[]]$RequiredPermissions = @(),
        [Parameter()]
        [hashtable]$SecurityContext = @{}
    )
    
    try {
        Write-StructuredLog -Message "Testing security preconditions" -Level INFO
        $startTime = Get-Date
        
        $result = New-SecurityResult -Operation $Operation -Target $Target -Context $SecurityContext
        $result.metadata.start_time = $startTime.ToString("o")
        
        # Verify execution context
        $currentIdentity = [WindowsIdentity]::GetCurrent()
        $principal = New-Object WindowsPrincipal($currentIdentity)
        $isAdmin = $principal.IsInRole([WindowsBuiltInRole]::Administrator)
        
        $result.context["identity"] = $currentIdentity.Name
        $result.context["is_admin"] = $isAdmin
        
        # Check required permissions
        foreach ($permission in $RequiredPermissions) {
            $check = @{
                type = "permission"
                name = $permission
                status = "pending"
                details = ""
            }
            
            try {
                switch ($permission) {
                    "FileSystem" {
                        $access = Test-Path $Target -ErrorAction Stop
                        if (-not $access) {
                            throw "No access to target path: $Target"
                        }
                        $check.status = "passed"
                    }
                    "Registry" {
                        $access = Test-Path "Registry::$Target" -ErrorAction Stop
                        if (-not $access) {
                            throw "No access to registry key: $Target"
                        }
                        $check.status = "passed"
                    }
                    "Network" {
                        $test = Test-NetConnection -ComputerName $Target -ErrorAction Stop
                        if (-not $test.PingSucceeded) {
                            throw "No network access to: $Target"
                        }
                        $check.status = "passed"
                    }
                    "Admin" {
                        if (-not $isAdmin) {
                            throw "Administrative privileges required"
                        }
                        $check.status = "passed"
                    }
                    default {
                        throw "Unknown permission type: $permission"
                    }
                }
            }
            catch {
                $check.status = "failed"
                $check.details = $_.Exception.Message
                $result.status.secure = $false
                $result.status.warnings += "Permission check failed: $permission"
            }
            
            $result.checks.permissions += $check
        }
        
        # Perform vulnerability checks
        $vulnChecks = @(
            @{
                name = "path_traversal"
                check = { param($targetPath) $targetPath -notmatch '\.\.\\' }
                message = "Path traversal detected"
            }
            @{
                name = "injection"
                check = { param($targetPath) $targetPath -notmatch '[;&|]' }
                message = "Command injection pattern detected"
            }
            @{
                name = "encoding"
                check = { param($targetPath) $targetPath -match '^[\w\-\./]+$' }
                message = "Invalid character encoding detected"
            }
        )
        
        foreach ($check in $vulnChecks) {
            $vuln = @{
                type = "vulnerability"
                name = $check.name
                status = "pending"
                details = ""
            }
            
            try {
                if (-not (& $check.check $Target)) {
                    throw $check.message
                }
                $vuln.status = "passed"
            }
            catch {
                $vuln.status = "failed"
                $vuln.details = $_.Exception.Message
                $result.status.secure = $false
                $result.status.warnings += "Vulnerability check failed: $($check.name)"
            }
            
            $result.checks.vulnerabilities += $vuln
        }
        
        # Update result
        $result.metadata.end_time = (Get-Date).ToString("o")
        $result.metrics.duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
        $result.metrics.checks_performed = $result.checks.permissions.Count + 
                                         $result.checks.vulnerabilities.Count + 
                                         $result.checks.compliance.Count
        $result.metrics.issues_found = ($result.checks.permissions + 
                                      $result.checks.vulnerabilities + 
                                      $result.checks.compliance | 
                                      Where-Object { $_.status -eq "failed" }).Count
        
        return $result
    }
    catch {
        Write-StructuredLog -Message "Failed to test security preconditions: $_" -Level ERROR
        $result.status.success = $false
        $result.status.secure = $false
        $result.status.errors += $_.Exception.Message
        $result.metadata.end_time = (Get-Date).ToString("o")
        return $result
    }
}

function Protect-Sensitive {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Data,
        [Parameter()]
        [string]$Purpose = "general",
        [Parameter()]
        [switch]$UseCompression
    )
    
    try {
        Write-StructuredLog -Message "Protecting sensitive data" -Level INFO
        $startTime = Get-Date
        
        $result = New-SecurityResult -Operation "protect" -Target $Purpose
        
        # Generate a secure key
        $key = [byte[]]::new(32)
        $rng = [RNGCryptoServiceProvider]::new()
        $rng.GetBytes($key)
        
        # Compress if requested
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Data)
        if ($UseCompression) {
            $ms = New-Object System.IO.MemoryStream
            $gs = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
            $gs.Write($bytes, 0, $bytes.Length)
            $gs.Close()
            $bytes = $ms.ToArray()
            $ms.Close()
        }
        
        # Encrypt the data
        $aes = [AesCng]::new()
        $aes.Key = $key
        $aes.GenerateIV()
        
        $encryptor = $aes.CreateEncryptor()
        $encrypted = $encryptor.TransformFinalBlock($bytes, 0, $bytes.Length)
        
        # Combine IV and encrypted data
        $result = [byte[]]::new($aes.IV.Length + $encrypted.Length)
        [Array]::Copy($aes.IV, 0, $result, 0, $aes.IV.Length)
        [Array]::Copy($encrypted, 0, $result, $aes.IV.Length, $encrypted.Length)
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            checks_performed = 1
            issues_found = 0
        }
        
        Write-StructuredLog -Message "Data protected successfully" -Level INFO -Properties @{
            purpose = $Purpose
            compressed = $UseCompression
            size_bytes = $result.Length
        }
        
        # Return protected data and key
        return @{
            protected_data = [Convert]::ToBase64String($result)
            key = [Convert]::ToBase64String($key)
            metadata = $result
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to protect sensitive data: $_" -Level ERROR
        $result.status.success = $false
        $result.status.secure = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

function Unprotect-Sensitive {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ProtectedData,
        [Parameter(Mandatory)]
        [string]$Key,
        [Parameter()]
        [switch]$WasCompressed
    )
    
    try {
        Write-StructuredLog -Message "Unprotecting sensitive data" -Level INFO
        $startTime = Get-Date
        
        $result = New-SecurityResult -Operation "unprotect" -Target "protected_data"
        
        # Decode from Base64
        $data = [Convert]::FromBase64String($ProtectedData)
        $key = [Convert]::FromBase64String($Key)
        
        # Extract IV and encrypted data
        $aes = [AesCng]::new()
        $iv = [byte[]]::new($aes.BlockSize / 8)
        $encrypted = [byte[]]::new($data.Length - $iv.Length)
        
        [Array]::Copy($data, 0, $iv, 0, $iv.Length)
        [Array]::Copy($data, $iv.Length, $encrypted, 0, $encrypted.Length)
        
        # Decrypt the data
        $aes.Key = $key
        $aes.IV = $iv
        
        $decryptor = $aes.CreateDecryptor()
        $decrypted = $decryptor.TransformFinalBlock($encrypted, 0, $encrypted.Length)
        
        # Decompress if needed
        if ($WasCompressed) {
            $ms = New-Object System.IO.MemoryStream($decrypted)
            $gs = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Decompress)
            $reader = New-Object System.IO.StreamReader($gs)
            $decrypted = [System.Text.Encoding]::UTF8.GetBytes($reader.ReadToEnd())
            $reader.Close()
            $gs.Close()
            $ms.Close()
        }
        
        # Update metrics
        $result.metrics = @{
            duration_ms = ((Get-Date) - $startTime).TotalMilliseconds
            checks_performed = 1
            issues_found = 0
        }
        
        Write-StructuredLog -Message "Data unprotected successfully" -Level INFO -Properties @{
            compressed = $WasCompressed
            size_bytes = $decrypted.Length
        }
        
        return @{
            data = [System.Text.Encoding]::UTF8.GetString($decrypted)
            metadata = $result
        }
    }
    catch {
        Write-StructuredLog -Message "Failed to unprotect sensitive data: $_" -Level ERROR
        $result.status.success = $false
        $result.status.secure = $false
        $result.status.errors += $_.Exception.Message
        return $result
    }
}

Export-ModuleMember -Function Test-SecurityPreconditions, Protect-Sensitive, Unprotect-Sensitive
