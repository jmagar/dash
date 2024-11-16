import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logger } from '../../utils/logger';
import type { Host } from '../../../types/models-shared';
import { SSHClient } from '../../../types/ssh';

const execAsync = promisify(exec);

interface InstallOptions {
  agentVersion: string;
  agentConfig: {
    server_url: string;
    agent_id: string;
    labels?: Record<string, string>;
  };
}

/**
 * Handles agent installation on remote hosts
 */
export class AgentInstaller {
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

    # Copy binary
    cp ./shh-agent /usr/local/bin/shh-agent
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

[Install]
WantedBy=multi-user.target
EOL

    # Reload systemd and start agent
    systemctl daemon-reload
    systemctl enable shh-agent
    systemctl start shh-agent

    echo "Agent installation complete"
  `;

  /**
   * Install agent on a host using existing SSH connection
   */
  public async install(host: Host, ssh: SSHClient, options: InstallOptions): Promise<void> {
    try {
      logger.info('Starting agent installation', {
        hostId: host.id,
        hostname: host.hostname,
      });

      // Create temporary directory
      const tempDir = `/tmp/shh-agent-${Date.now()}`;
      await this.execCommand(ssh, `mkdir -p ${tempDir}`);

      // Create config file
      const configContent = JSON.stringify({
        agent: {
          id: options.agentConfig.agent_id,
          labels: options.agentConfig.labels || {},
        },
        server: {
          url: options.agentConfig.server_url,
        },
      }, null, 2);

      // Write config file
      await this.execCommand(ssh, `cat > ${tempDir}/config.json << 'EOL'\n${configContent}\nEOL`);

      // Copy agent binary
      // TODO: Select correct binary based on host OS and architecture
      const binaryPath = path.join(__dirname, '../../../../bin/shh-agent');
      await this.execCommand(ssh, `cp ${binaryPath} ${tempDir}/shh-agent`);

      // Write install script
      await this.execCommand(ssh, `cat > ${tempDir}/install.sh << 'EOL'\n${this.installScript}\nEOL`);
      await this.execCommand(ssh, `chmod +x ${tempDir}/install.sh`);

      // Run installation
      await this.execCommand(ssh, `cd ${tempDir} && ./install.sh`);

      // Cleanup
      await this.execCommand(ssh, `rm -rf ${tempDir}`);

      logger.info('Agent installation completed', {
        hostId: host.id,
        hostname: host.hostname,
      });
    } catch (error) {
      logger.error('Agent installation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
        hostname: host.hostname,
      });
      throw error;
    }
  }

  /**
   * Execute command over SSH
   */
  private async execCommand(ssh: SSHClient, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ssh.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        let error = '';

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          error += data.toString();
        });

        stream.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Command failed with code ${code}: ${error}`));
          } else {
            resolve(output);
          }
        });
      });
    });
  }
}
