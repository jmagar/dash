import { Client as SSHClient } from 'ssh2';
import { BaseInstaller } from './base';
import type { Host } from '../../../../types/host';
import type { InstallOptions } from '../host.types';

export class LinuxInstaller extends BaseInstaller {
  private readonly installScript = `
    #!/bin/bash
    set -e

    # Check if agent is already installed
    if [ -f "/usr/local/bin/shh-agent" ]; then
      echo "Agent already installed, updating..."
    fi

    # Create agent directories
    mkdir -p /etc/shh-agent
    mkdir -p /var/log/shh-agent
    mkdir -p /var/lib/shh-agent

    # Copy binary and make executable
    mv ./shh-agent /usr/local/bin/shh-agent
    chmod +x /usr/local/bin/shh-agent

    # Create systemd service
    cat > /etc/systemd/system/shh-agent.service << 'EOL'
[Unit]
Description=SSH Helper Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/shh-agent
Restart=always
RestartSec=10
WorkingDirectory=/var/lib/shh-agent
User=root
Environment=SHH_CONFIG_FILE=/etc/shh-agent/config.json

[Install]
WantedBy=multi-user.target
EOL

    # Reload systemd and start agent
    systemctl daemon-reload
    systemctl enable shh-agent
    systemctl start shh-agent

    echo "Agent installation complete"
  `;

  async install(host: Host, ssh: SSHClient, options: InstallOptions): Promise<void> {
    try {
      // Create temporary directory
      const tempDir = `/tmp/shh-agent-${Date.now()}`;
      await this.executeCommand(ssh, `mkdir -p ${tempDir}`);

      // Write config file
      const config = {
        server: {
          url: options.config?.serverUrl,
        },
        agent: {
          id: host.id,
          features: options.config?.features || [],
          labels: options.config?.labels || {},
        },
      };

      await this.executeCommand(
        ssh,
        `cat > ${tempDir}/config.json << 'EOL'\n${JSON.stringify(config, null, 2)}\nEOL`
      );

      // Copy agent binary
      const binaryPath = `/usr/local/bin/shh-agent-linux-${process.arch}`;
      await this.copyFile(ssh, binaryPath, `${tempDir}/shh-agent`);

      // Write install script
      await this.executeCommand(
        ssh,
        `cat > ${tempDir}/install.sh << 'EOL'\n${this.installScript}\nEOL`
      );

      // Make script executable
      await this.executeCommand(ssh, `chmod +x ${tempDir}/install.sh`);

      // Run installation with sudo
      await this.executeCommand(ssh, `cd ${tempDir} && sudo ./install.sh`);

      // Cleanup
      await this.executeCommand(ssh, `rm -rf ${tempDir}`);
    } catch (error) {
      throw new Error(
        `Failed to install agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async uninstall(host: Host, ssh: SSHClient): Promise<void> {
    try {
      // Stop and disable service
      await this.executeCommand(ssh, 'sudo systemctl stop shh-agent');
      await this.executeCommand(ssh, 'sudo systemctl disable shh-agent');

      // Remove files
      await this.executeCommand(
        ssh,
        'sudo rm -rf /usr/local/bin/shh-agent /etc/shh-agent /var/log/shh-agent /var/lib/shh-agent /etc/systemd/system/shh-agent.service'
      );

      // Reload systemd
      await this.executeCommand(ssh, 'sudo systemctl daemon-reload');
    } catch (error) {
      throw new Error(
        `Failed to uninstall agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async upgrade(host: Host, ssh: SSHClient, version: string): Promise<void> {
    try {
      // Create temporary directory
      const tempDir = `/tmp/shh-agent-upgrade-${Date.now()}`;
      await this.executeCommand(ssh, `mkdir -p ${tempDir}`);

      // Copy new binary
      const binaryPath = `/usr/local/bin/shh-agent-linux-${process.arch}`;
      await this.copyFile(ssh, binaryPath, `${tempDir}/shh-agent`);

      // Stop service
      await this.executeCommand(ssh, 'sudo systemctl stop shh-agent');

      // Replace binary
      await this.executeCommand(ssh, `sudo mv ${tempDir}/shh-agent /usr/local/bin/shh-agent`);
      await this.executeCommand(ssh, 'sudo chmod +x /usr/local/bin/shh-agent');

      // Start service
      await this.executeCommand(ssh, 'sudo systemctl start shh-agent');

      // Cleanup
      await this.executeCommand(ssh, `rm -rf ${tempDir}`);
    } catch (error) {
      throw new Error(
        `Failed to upgrade agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
