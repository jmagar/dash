import { Client as SSHClient } from 'ssh2';
import { logger } from '../../utils/logger';
import type { InstallOptions } from './types';

/**
 * Utility class for agent installation operations
 */
export class AgentInstaller {
  private readonly logger = logger;
  private readonly agentPath = '/opt/shh/agent';
  private readonly configPath = '/opt/shh/agent/config.yaml';
  private readonly serviceName = 'shh-agent';

  /**
   * Copy agent binary to remote host
   */
  async copyBinary(ssh: SSHClient, version: string): Promise<void> {
    // Create agent directory
    await this.execCommand(ssh, `sudo mkdir -p ${this.agentPath}`);
    
    // Download agent binary
    const downloadUrl = `https://github.com/codeium/shh/releases/download/${version}/agent-linux-amd64`;
    await this.execCommand(ssh, `
      sudo curl -L ${downloadUrl} -o ${this.agentPath}/agent &&
      sudo chmod +x ${this.agentPath}/agent
    `);
  }

  /**
   * Write agent configuration
   */
  async writeConfig(ssh: SSHClient, config: InstallOptions['config']): Promise<void> {
    if (!config) return;

    const configYaml = `
server:
  url: ${config.serverUrl}

features:
${config.features.map(f => `  ${f}: true`).join('\n')}

labels:
${Object.entries(config.labels || {})
  .map(([k, v]) => `  ${k}: ${v}`)
  .join('\n')}
`;

    // Write config file
    await this.execCommand(ssh, `
      sudo mkdir -p $(dirname ${this.configPath}) &&
      echo '${configYaml}' | sudo tee ${this.configPath}
    `);
  }

  /**
   * Install and start agent service
   */
  async installService(ssh: SSHClient): Promise<void> {
    const serviceConfig = `
[Unit]
Description=SSH Helper Agent
After=network.target

[Service]
Type=simple
ExecStart=${this.agentPath}/agent
Restart=always
RestartSec=10
WorkingDirectory=${this.agentPath}

[Install]
WantedBy=multi-user.target
`;

    // Write service file
    await this.execCommand(ssh, `
      echo '${serviceConfig}' | sudo tee /etc/systemd/system/${this.serviceName}.service &&
      sudo systemctl daemon-reload &&
      sudo systemctl enable ${this.serviceName} &&
      sudo systemctl start ${this.serviceName}
    `);
  }

  /**
   * Execute command and handle errors
   */
  private async execCommand(ssh: SSHClient, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ssh.exec(command, (err, stream) => {
        if (err) {
          this.logger.error('Failed to execute command', { 
            error: err, 
            command 
          });
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
            this.logger.error('Command failed', { 
              code, 
              error, 
              command 
            });
            reject(new Error(`Command failed with code ${code}: ${error}`));
          } else {
            resolve(output.trim());
          }
        });
      });
    });
  }
}
