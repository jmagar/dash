/**
 * Installation scripts for Windows and Linux agents
 */

export const windowsInstallScript = `
    # Create log directories
    $LogBase = "C:\\ProgramData\\shh\\logs"
    New-Item -ItemType Directory -Force -Path "$LogBase\\agent"
    New-Item -ItemType Directory -Force -Path "$LogBase\\server"
    New-Item -ItemType Directory -Force -Path "$LogBase\\ui"

    # Set appropriate permissions
    $Acl = Get-Acl $LogBase
    $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users","Modify","ContainerInherit,ObjectInherit","None","Allow")
    $Acl.SetAccessRule($AccessRule)
    Set-Acl $LogBase $Acl

    # Create agent directories
    New-Item -ItemType Directory -Force -Path "C:\\ProgramData\\shh-agent"
    New-Item -ItemType Directory -Force -Path "C:\\ProgramData\\shh-agent\\logs"

    # Copy binary and config
    Copy-Item ".\\shh-agent.exe" -Destination "C:\\Program Files\\shh-agent\\shh-agent.exe"
    Copy-Item ".\\config.json" -Destination "C:\\ProgramData\\shh-agent\\config.json"

    # Create Windows Service
    New-Service -Name "SHHAgent" \
                -DisplayName "SSH Helper Agent" \
                -Description "System Health & Harmony Agent Service" \
                -BinaryPathName "C:\\Program Files\\shh-agent\\shh-agent.exe" \
                -StartupType Automatic

    # Start the service
    Start-Service -Name "SHHAgent"

    # Configure Windows Event Log
    New-EventLog -LogName Application -Source "SHH-Agent"
    Limit-EventLog -LogName Application -Source "SHH-Agent" -RetentionDays 7

    # Create scheduled task for log rotation
    $Action = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\\ProgramData\\shh-agent\\rotate-logs.ps1"'
    $Trigger = New-ScheduledTaskTrigger -Daily -At 12AM
    Register-ScheduledTask -TaskName "SHH-Agent-LogRotation" -Action $Action -Trigger $Trigger -RunLevel Highest -Force

    # Create log rotation script
    @'
    $LogPath = "C:\\ProgramData\\shh\\logs\\agent"
    $MaxAgeDays = 7
    $MaxSizeMB = 100

    Get-ChildItem -Path $LogPath -Filter "*.log" | ForEach-Object {
        if ($_.LastWriteTime -lt (Get-Date).AddDays(-$MaxAgeDays) -or
            $_.Length -gt ($MaxSizeMB * 1MB)) {
            $Archive = Join-Path $LogPath "archive"
            if (-not (Test-Path $Archive)) {
                New-Item -ItemType Directory -Force -Path $Archive
            }
            Move-Item $_.FullName -Destination (Join-Path $Archive ($_.Name + "." + (Get-Date -Format "yyyyMMdd")))
        }
    }

    Get-ChildItem -Path (Join-Path $LogPath "archive") |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force
    '@ | Out-File -FilePath "C:\\ProgramData\\shh-agent\\rotate-logs.ps1" -Encoding UTF8
`;

export const unixInstallScript = `
    #!/bin/bash
    set -e

    # Create log directories on host
    mkdir -p /mnt/user/appdata/shh/logs/{agent,server,ui}
    chmod -R 755 /mnt/user/appdata/shh/logs
    chown -R syslog:adm /mnt/user/appdata/shh/logs

    # Configure rsyslog for agent
    cat > /etc/rsyslog.d/10-shh-agent.conf << 'EOL'
# SHH Agent logging configuration
local0.*                        /mnt/user/appdata/shh/logs/agent/agent.log
local0.info                     /mnt/user/appdata/shh/logs/agent/info.log
local0.warn                     /mnt/user/appdata/shh/logs/agent/warn.log
local0.error                    /mnt/user/appdata/shh/logs/agent/error.log

# Enable TCP syslog reception
module(load="imtcp")
input(type="imtcp" port="1514")

# Set up template for structured logging
template(name="JSONFormat" type="list") {
    property(name="timereported")
    constant(value=" ")
    property(name="hostname")
    constant(value=" ")
    property(name="syslogtag")
    constant(value=" ")
    property(name="msg" format="json")
    constant(value="\n")
}

# Apply template to agent logs
local0.* action(type="omfile" file="/mnt/user/appdata/shh/logs/agent/agent.log" template="JSONFormat")
EOL

    # Configure log rotation
    cat > /etc/logrotate.d/shh-agent << 'EOL'
/mnt/user/appdata/shh/logs/agent/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 640 syslog adm
    sharedscripts
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
EOL

    # Create symbolic links for compatibility
    ln -sf /mnt/user/appdata/shh/logs/agent /var/log/shh-agent

    # Restart rsyslog to apply changes
    systemctl restart rsyslog

    # Create agent directories
    mkdir -p /etc/shh-agent
    mkdir -p /var/lib/shh-agent

    # Copy binary and config
    cp ./shh-agent /usr/local/bin/shh-agent
    chmod +x /usr/local/bin/shh-agent
    cp ./config.json /etc/shh-agent/config.json

    # Create systemd service
    cat > /etc/systemd/system/shh-agent.service << 'EOL'
[Unit]
Description=SSH Helper Agent
After=network.target rsyslog.service

[Service]
Type=simple
ExecStart=/usr/local/bin/shh-agent
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=shh-agent
SyslogFacility=local0

[Install]
WantedBy=multi-user.target
EOL

    # Reload systemd and start service
    systemctl daemon-reload
    systemctl enable shh-agent
    systemctl start shh-agent
`;
