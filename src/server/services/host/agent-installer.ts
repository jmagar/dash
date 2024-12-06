import { Client as SSHClient } from 'ssh2';
import type { InstallOptions } from './types';
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import type { Logger, LogMetadata, LogContext } from '../../../types/logger';

/**
 * Utility class for agent installation operations
 */
export class AgentInstaller {
  private readonly logger: Logger;
  private readonly agentPath = '/opt/shh/agent';
  private readonly configPath = '/opt/shh/agent/config.yaml';
  private readonly serviceName = 'shh-agent';

  constructor(logManager?: LoggingManager) {
    const baseLogger = logManager ?? LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, {
      component: 'AgentInstaller',
      service: 'HostService'
    });
  }

  /**
   * Copy agent binary to remote host
   */
  async copyBinary(ssh: SSHClient, version: string): Promise<void> {
    const startTime = Date.now();
    const context: LogContext = {
      operation: 'copyBinary',
      component: 'AgentInstaller',
      version
    };
    const methodLogger = this.logger.withContext(context);

    try {
      methodLogger.info('Starting agent binary copy', { version });

      // Create agent directory
      await this.execCommand(ssh, `sudo mkdir -p ${this.agentPath}`);
      
      // Download agent binary
      const downloadUrl = `https://github.com/codeium/shh/releases/download/${version}/agent-linux-amd64`;
      await this.execCommand(ssh, `
        sudo curl -L ${downloadUrl} -o ${this.agentPath}/agent &&
        sudo chmod +x ${this.agentPath}/agent
      `);

      const duration = Date.now() - startTime;
      methodLogger.info('Agent binary copy completed', {
        version,
        timing: { total: duration }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        version,
        timing: { total: duration }
      };
      methodLogger.error('Failed to copy agent binary', metadata);
      throw error;
    }
  }

  /**
   * Write agent configuration
   */
  async writeConfig(ssh: SSHClient, config: InstallOptions['config']): Promise<void> {
    if (!config) return;

    const startTime = Date.now();
    const context: LogContext = {
      operation: 'writeConfig',
      component: 'AgentInstaller'
    };
    const methodLogger = this.logger.withContext(context);

    try {
      methodLogger.info('Starting config write', {
        serverUrl: config.serverUrl,
        features: config.features
      });

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

      const duration = Date.now() - startTime;
      methodLogger.info('Config write completed', {
        timing: { total: duration }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Failed to write config', metadata);
      throw error;
    }
  }

  /**
   * Install and start agent service
   */
  async installService(ssh: SSHClient): Promise<void> {
    const startTime = Date.now();
    const context: LogContext = {
      operation: 'installService',
      component: 'AgentInstaller'
    };
    const methodLogger = this.logger.withContext(context);

    try {
      methodLogger.info('Starting service installation');

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

      const duration = Date.now() - startTime;
      methodLogger.info('Service installation completed', {
        timing: { total: duration }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Failed to install service', metadata);
      throw error;
    }
  }

  /**
   * Execute command and handle errors
   */
  private async execCommand(ssh: SSHClient, command: string): Promise<string> {
    const startTime = Date.now();
    const context: LogContext = {
      operation: 'execCommand',
      component: 'AgentInstaller'
    };
    const methodLogger = this.logger.withContext(context);

    return new Promise((resolve, reject) => {
      methodLogger.debug('Executing command', {
        command: command.replace(/\n\s+/g, ' ').trim()
      });

      ssh.exec(command, (err, stream) => {
        if (err) {
          const metadata: LogMetadata = {
            error: err,
            command: command.replace(/\n\s+/g, ' ').trim()
          };
          methodLogger.error('Command execution failed', metadata);
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
          const duration = Date.now() - startTime;
          if (code !== 0) {
            const metadata: LogMetadata = {
              error: new Error(error || 'Command failed'),
              command: command.replace(/\n\s+/g, ' ').trim(),
              exitCode: code,
              timing: { total: duration }
            };
            methodLogger.error('Command execution failed', metadata);
            reject(new Error(`Command failed with code ${code}: ${error}`));
          } else {
            methodLogger.debug('Command execution completed', {
              exitCode: code,
              timing: { total: duration }
            });
            resolve(output.trim());
          }
        });
      });
    });
  }
}
