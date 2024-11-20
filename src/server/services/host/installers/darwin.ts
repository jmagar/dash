import { Client as SSHClient } from 'ssh2';
import { BaseInstaller } from './base';
import type { Host } from '../../../../types/host';
import type { InstallOptions } from '../host.types';

export class DarwinInstaller extends BaseInstaller {
  private readonly launchdPlist = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ssh-helper.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/shh-agent</string>
        <string>--config</string>
        <string>/etc/shh-agent/config.json</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/shh-agent/agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/shh-agent/error.log</string>
    <key>WorkingDirectory</key>
    <string>/var/lib/shh-agent</string>
</dict>
</plist>
  `.trim();

  private readonly installScript = `
    #!/bin/bash
    set -e

    # Check if running as root
    if [ "$(id -u)" != "0" ]; then
      echo "Error: Must run as root"
      exit 1
    fi

    # Create directories
    mkdir -p /etc/shh-agent
    mkdir -p /var/log/shh-agent
    mkdir -p /var/lib/shh-agent

    # Copy binary
    mv ./shh-agent /usr/local/bin/shh-agent
    chmod +x /usr/local/bin/shh-agent

    # Copy config
    mv ./config.json /etc/shh-agent/config.json

    # Install launchd service
    mv ./com.ssh-helper.agent.plist /Library/LaunchDaemons/
    chmod 644 /Library/LaunchDaemons/com.ssh-helper.agent.plist

    # Load and start service
    launchctl load -w /Library/LaunchDaemons/com.ssh-helper.agent.plist
    launchctl start com.ssh-helper.agent

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

      // Write launchd plist
      await this.executeCommand(
        ssh,
        `cat > ${tempDir}/com.ssh-helper.agent.plist << 'EOL'\n${this.launchdPlist}\nEOL`
      );

      // Copy agent binary
      const binaryPath = `/usr/local/bin/shh-agent-darwin-${process.arch}`;
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

      // Verify service is running
      const serviceStatus = await this.executeCommand(
        ssh,
        'sudo launchctl list | grep com.ssh-helper.agent'
      );

      if (!serviceStatus.trim()) {
        throw new Error('Service installation verified but service is not running');
      }

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
      // Stop and unload service
      await this.executeCommand(ssh, 'sudo launchctl stop com.ssh-helper.agent');
      await this.executeCommand(ssh, 'sudo launchctl unload -w /Library/LaunchDaemons/com.ssh-helper.agent.plist');

      // Remove files
      await this.executeCommand(
        ssh,
        'sudo rm -rf /usr/local/bin/shh-agent /etc/shh-agent /var/log/shh-agent /var/lib/shh-agent /Library/LaunchDaemons/com.ssh-helper.agent.plist'
      );
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
      const binaryPath = `/usr/local/bin/shh-agent-darwin-${process.arch}`;
      await this.copyFile(ssh, binaryPath, `${tempDir}/shh-agent`);

      // Stop service
      await this.executeCommand(ssh, 'sudo launchctl stop com.ssh-helper.agent');

      // Replace binary
      await this.executeCommand(ssh, `sudo mv ${tempDir}/shh-agent /usr/local/bin/shh-agent`);
      await this.executeCommand(ssh, 'sudo chmod +x /usr/local/bin/shh-agent');

      // Start service
      await this.executeCommand(ssh, 'sudo launchctl start com.ssh-helper.agent');

      // Verify service is running
      const serviceStatus = await this.executeCommand(
        ssh,
        'sudo launchctl list | grep com.ssh-helper.agent'
      );

      if (!serviceStatus.trim()) {
        throw new Error('Service upgrade completed but service is not running');
      }

      // Cleanup
      await this.executeCommand(ssh, `rm -rf ${tempDir}`);
    } catch (error) {
      throw new Error(
        `Failed to upgrade agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
