import { logger } from '../utils/logger';
import { sshService } from './ssh.service';
import type { Host } from '../../types/models-shared';
import { db } from '../db';
import { ApiError } from '../../types/error';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';

interface AgentConfig {
  server_url: string;
  agent_id: string;
  labels?: Record<string, string>;
}

interface InstallOptions {
  installInContainer?: boolean;
  containerName?: string;
  useHostNetwork?: boolean;
  mountHostPaths?: boolean;
}

class AgentInstallerService {
  private readonly installScript = `
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

  public async executeCommand(host: Host, command: string, options?: { sudo?: boolean }): Promise<void> {
    const fullCommand = options?.sudo ? `sudo ${command}` : command;
    const result = await sshService.executeCommand(host.id, fullCommand);
    if (result.exitCode !== 0) {
      throw new Error(`Command failed: ${result.stderr}`);
    }
  }

  public async copyFile(host: Host, localPath: string, remotePath: string): Promise<void> {
    // TODO: Implement SCP file transfer
    await this.executeCommand(host, `cat > ${remotePath} << 'EOL'\n${await fs.readFile(localPath, 'utf-8')}\nEOL`);
  }

  public async setupLogging(host: Host): Promise<void> {
    await this.executeCommand(host, this.installScript, { sudo: true });
  }

  public async installAgent(host: Host, config: AgentConfig): Promise<void> {
    const configPath = path.join(config.server_url, 'agent', 'config.json');
    const binaryPath = path.join(config.server_url, 'agent', 'shh-agent');

    await this.copyFile(host, configPath, '/tmp/config.json');
    await this.copyFile(host, binaryPath, '/tmp/shh-agent');

    await this.executeCommand(host, 'sudo mv /tmp/config.json /etc/shh-agent/config.json');
    await this.executeCommand(host, 'sudo mv /tmp/shh-agent /usr/local/bin/shh-agent');
    await this.executeCommand(host, 'sudo chmod +x /usr/local/bin/shh-agent');
  }

  public async startAgent(host: Host): Promise<void> {
    await this.executeCommand(host, 'sudo systemctl daemon-reload');
    await this.executeCommand(host, 'sudo systemctl enable shh-agent');
    await this.executeCommand(host, 'sudo systemctl start shh-agent');
  }

  public async stopAgent(host: Host): Promise<void> {
    await this.executeCommand(host, 'sudo systemctl stop shh-agent');
    await this.executeCommand(host, 'sudo systemctl disable shh-agent');
  }

  public async uninstallAgent(host: Host): Promise<void> {
    await this.executeCommand(host, 'sudo rm -rf /etc/shh-agent');
    await this.executeCommand(host, 'sudo rm -f /usr/local/bin/shh-agent');
    await this.executeCommand(host, 'sudo rm -f /etc/systemd/system/shh-agent.service');
    await this.executeCommand(host, 'sudo systemctl daemon-reload');
  }

  public async install(host: Host, options: InstallOptions = {}): Promise<void> {
    try {
      await this.setupLogging(host);
      await this.installAgent(host, {
        server_url: config.server.websocketUrl,
        agent_id: host.id,
        labels: {
          environment: host.environment || 'production',
          ...host.tags?.reduce((acc, tag) => ({ ...acc, [tag]: 'true' }), {}),
        },
      });
      await this.startAgent(host);

      await db.query(
        'UPDATE hosts SET agent_status = $1 WHERE id = $2',
        ['installed', host.id]
      );
    } catch (error) {
      logger.error('Failed to install agent:', {
        hostId: host.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async uninstall(host: Host): Promise<void> {
    try {
      await this.stopAgent(host);
      await this.uninstallAgent(host);

      await db.query(
        'UPDATE hosts SET agent_status = $1 WHERE id = $2',
        [null, host.id]
      );
    } catch (error) {
      logger.error('Failed to uninstall agent:', {
        hostId: host.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const agentInstallerService = new AgentInstallerService();
