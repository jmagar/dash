import { LoggingManager } from '../../managers/utils/LoggingManager';
/**
 * @deprecated This file is being replaced by the new AgentService.
 * All functionality should be migrated to src/server/services/agent/agent.service.ts
 * TODO: Remove this file once migration is complete.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
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

interface SystemInfo {
  os: 'windows' | 'linux';
  arch: 'x64' | 'arm64' | 'arm';
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

  private readonly windowsInstallScript = `
    @echo off

    REM Check if agent is already installed
    if exist "C:\\Program Files\\SSH Helper\\shh-agent.exe" (
      echo Agent already installed, updating...
    )

    REM Create agent directories
    mkdir "C:\\Program Files\\SSH Helper" 2>nul
    mkdir "C:\\ProgramData\\SSH Helper\\logs" 2>nul
    mkdir "C:\\ProgramData\\SSH Helper\\data" 2>nul

    REM Copy binary
    copy /Y shh-agent.exe "C:\\Program Files\\SSH Helper\\shh-agent.exe"

    REM Create Windows service
    sc create "SSH Helper Agent" binPath= "C:\\Program Files\\SSH Helper\\shh-agent.exe" start= auto
    sc description "SSH Helper Agent" "SSH Helper Agent Service"
    sc start "SSH Helper Agent"

    echo Agent installation complete
  `;

  /**
   * Get system information from remote host
   */
  private async getSystemInfo(ssh: SSHClient): Promise<SystemInfo> {
    let os: 'windows' | 'linux';
    let arch: 'x64' | 'arm64' | 'arm';

    try {
      // Try Windows command first
      const systemInfoCmd = 'systeminfo | findstr /B /C:"OS Name" /C:"System Type"';
      const result = await this.execCommand(ssh, systemInfoCmd);
      if (result.includes('Windows')) {
        os = 'windows';
        arch = result.includes('x64') ? 'x64' :
               result.includes('ARM64') ? 'arm64' : 'arm';
      } else {
        // Try Linux commands
        const archCmd = 'uname -m';
        const archResult = await this.execCommand(ssh, archCmd);
        os = 'linux';
        arch = archResult.includes('x86_64') ? 'x64' :
               archResult.includes('aarch64') ? 'arm64' : 'arm';
      }

      return { os, arch };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerLoggingManager.getInstance().();
      throw new Error('Failed to detect system architecture');
    }
  }

  /**
   * Get the appropriate binary path based on OS and architecture
   */
  private getBinaryPath(systemInfo: SystemInfo): string {
    const binDir = path.join(__dirname, '../../../../bin');
    const binaryName = systemInfo.os === 'windows' ? 'shh-agent.exe' : 'shh-agent';
    const archSuffix = `-${systemInfo.arch}`;
    const osSuffix = `-${systemInfo.os}`;

    const binaryPath = path.join(binDir, `${binaryName}${osSuffix}${archSuffix}`);

    // Verify binary exists
    try {
      if (!fs.existsSync(binaryPath)) {
        throw new Error(`Binary not found for ${systemInfo.os}-${systemInfo.arch}`);
      }
      return binaryPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerLoggingManager.getInstance().();
      throw new Error(`Agent binary not available for ${systemInfo.os}-${systemInfo.arch}`);
    }
  }

  /**
   * Install agent on a host using existing SSH connection
   */
  public async install(host: Host, ssh: SSHClient, options: InstallOptions): Promise<void> {
    try {
      loggerLoggingManager.getInstance().();

      // Get system information
      const systemInfo = await this.getSystemInfo(ssh);
      loggerLoggingManager.getInstance().();

      // Get appropriate binary
      const binaryPath = this.getBinaryPath(systemInfo);

      // Create temporary directory
      const tempDir = systemInfo.os === 'windows' ?
        `C:\\Windows\\Temp\\shh-agent-${Date.now()}` :
        `/tmp/shh-agent-${Date.now()}`;

      await this.execCommand(ssh, systemInfo.os === 'windows' ?
        `mkdir "${tempDir}"` :
        `mkdir -p ${tempDir}`
      );

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
      await this.execCommand(ssh, systemInfo.os === 'windows' ?
        `echo ${configContent.replace(/"/g, '\\"')} > "${tempDir}\\config.json"` :
        `cat > ${tempDir}/config.json << 'EOL'\n${configContent}\nEOL`
      );

      // Copy agent binary
      await this.execCommand(ssh, systemInfo.os === 'windows' ?
        `copy /Y "${binaryPath}" "${tempDir}\\shh-agent.exe"` :
        `cp ${binaryPath} ${tempDir}/shh-agent`
      );

      // Write install script
      const installScript = systemInfo.os === 'windows' ?
        this.windowsInstallScript :
        this.installScript;

      await this.execCommand(ssh, systemInfo.os === 'windows' ?
        `echo ${installScript.replace(/"/g, '\\"')} > "${tempDir}\\install.bat"` :
        `cat > ${tempDir}/install.sh << 'EOL'\n${installScript}\nEOL`
      );

      // Make script executable (Linux only)
      if (systemInfo.os === 'linux') {
        await this.execCommand(ssh, `chmod +x ${tempDir}/install.sh`);
      }

      // Run installation
      await this.execCommand(ssh, systemInfo.os === 'windows' ?
        `cd "${tempDir}" && install.bat` :
        `cd ${tempDir} && ./install.sh`
      );

      // Cleanup
      await this.execCommand(ssh, systemInfo.os === 'windows' ?
        `rmdir /S /Q "${tempDir}"` :
        `rm -rf ${tempDir}`
      );

      loggerLoggingManager.getInstance().();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerLoggingManager.getInstance().();
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
            resolve(output.trim());
          }
        });
      });
    });
  }
}


