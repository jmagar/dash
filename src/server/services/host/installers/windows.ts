import { Client as SSHClient } from 'ssh2';
import { BaseInstaller } from './base';
import type { Host } from '../../../../types/host';
import type { InstallOptions } from '../host.types';

export class WindowsInstaller extends BaseInstaller {
  private readonly installScript = `
    @echo off
    setlocal enabledelayedexpansion

    REM Check if running with admin privileges
    net session >nul 2>&1
    if %errorLevel% neq 0 (
        echo Error: Administrative privileges required
        exit /b 1
    )

    REM Check if agent is already installed
    if exist "C:/Program Files/SSH Helper/shh-agent.exe" (
        echo Agent already installed, updating...
    )

    REM Create agent directories
    mkdir "C:/Program Files/SSH Helper" 2>nul
    mkdir "C:/ProgramData/SSH Helper/logs" 2>nul
    mkdir "C:/ProgramData/SSH Helper/data" 2>nul

    REM Copy files
    copy /Y shh-agent.exe "C:/Program Files/SSH Helper/shh-agent.exe"
    copy /Y config.json "C:/ProgramData/SSH Helper/config.json"

    REM Create service
    sc stop "SSH Helper Agent" >nul 2>&1
    sc delete "SSH Helper Agent" >nul 2>&1

    REM Wait for service to fully stop
    timeout /t 2 /nobreak >nul

    sc create "SSH Helper Agent" binPath= "C:/Program Files/SSH Helper/shh-agent.exe --config C:/ProgramData/SSH Helper/config.json" start= auto
    if !errorLevel! neq 0 (
        echo Error: Failed to create service
        exit /b 1
    )

    REM Configure service
    sc description "SSH Helper Agent" "SSH Helper Agent Service"
    sc config "SSH Helper Agent" obj= "LocalSystem"
    sc failure "SSH Helper Agent" reset= 86400 actions= restart/60000/restart/60000/restart/60000

    REM Start service
    sc start "SSH Helper Agent"
    if !errorLevel! neq 0 (
        echo Error: Failed to start service
        exit /b 1
    )

    echo Agent installation complete
    exit /b 0
  `.trim();

  async install(host: Host, ssh: SSHClient, options: InstallOptions): Promise<void> {
    try {
      // Check prerequisites
      const hasAdmin = await this.hasAdminPrivileges(ssh);
      if (!hasAdmin) {
        throw new Error('Administrative privileges required');
      }

      // Create temporary directory
      const tempDir = `C:/Windows/Temp/shh-agent-${Date.now()}`;
      await this.executeCommand(ssh, `mkdir "${tempDir}"`);

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
        logging: {
          directory: 'C:/ProgramData/SSH Helper/logs',
          level: 'info',
        },
        data: {
          directory: 'C:/ProgramData/SSH Helper/data',
        },
      };

      // Use PowerShell to write JSON file to avoid escaping issues
      await this.executeCommand(
        ssh,
        `powershell -Command "$config = '${JSON.stringify(config)}' | ConvertFrom-Json; $config | ConvertTo-Json -Depth 10 | Set-Content '${tempDir}/config.json'"`
      );

      // Copy agent binary
      const binaryPath = `C:/Program Files/SSH Helper/shh-agent-windows-${process.arch}.exe`;
      await this.copyFile(ssh, binaryPath, `${tempDir}/shh-agent.exe`);

      // Write install script using PowerShell to avoid escaping issues
      await this.executeCommand(
        ssh,
        `powershell -Command "Set-Content -Path '${tempDir}/install.bat' -Value @'\n${this.installScript}\n'@"`
      );

      // Run installation script with elevated privileges
      await this.executeCommand(
        ssh,
        `powershell -Command "Start-Process -FilePath '${tempDir}/install.bat' -Verb RunAs -Wait"`
      );

      // Verify service is running
      const serviceStatus = await this.executeCommand(
        ssh,
        'sc query "SSH Helper Agent" | findstr STATE'
      );

      if (!serviceStatus.includes('RUNNING')) {
        throw new Error('Service installation verified but service is not running');
      }

      // Cleanup
      await this.executeCommand(ssh, `rmdir /s /q "${tempDir}"`);
    } catch (error) {
      throw new Error(
        `Failed to install agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async uninstall(host: Host, ssh: SSHClient): Promise<void> {
    try {
      // Stop and remove service
      await this.executeCommand(ssh, 'sc stop "SSH Helper Agent"');
      await this.executeCommand(ssh, 'sc delete "SSH Helper Agent"');

      // Wait for service to fully stop
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Remove files
      await this.executeCommand(ssh, 'rmdir /s /q "C:/Program Files/SSH Helper"');
      await this.executeCommand(ssh, 'rmdir /s /q "C:/ProgramData/SSH Helper"');
    } catch (error) {
      throw new Error(
        `Failed to uninstall agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async upgrade(host: Host, ssh: SSHClient, version: string): Promise<void> {
    try {
      // Create temporary directory
      const tempDir = `C:/Windows/Temp/shh-agent-upgrade-${Date.now()}`;
      await this.executeCommand(ssh, `mkdir "${tempDir}"`);

      // Copy new binary
      const binaryPath = `C:/Program Files/SSH Helper/shh-agent-windows-${process.arch}.exe`;
      await this.copyFile(ssh, binaryPath, `${tempDir}/shh-agent.exe`);

      // Stop service
      await this.executeCommand(ssh, 'sc stop "SSH Helper Agent"');

      // Wait for service to fully stop
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Replace binary using PowerShell to handle paths correctly
      await this.executeCommand(
        ssh,
        `powershell -Command "Copy-Item -Path '${tempDir}/shh-agent.exe' -Destination 'C:/Program Files/SSH Helper/shh-agent.exe' -Force"`
      );

      // Start service
      await this.executeCommand(ssh, 'sc start "SSH Helper Agent"');

      // Verify service is running
      const serviceStatus = await this.executeCommand(
        ssh,
        'sc query "SSH Helper Agent" | findstr STATE'
      );

      if (!serviceStatus.includes('RUNNING')) {
        throw new Error('Service upgrade completed but service is not running');
      }

      // Cleanup
      await this.executeCommand(ssh, `rmdir /s /q "${tempDir}"`);
    } catch (error) {
      throw new Error(
        `Failed to upgrade agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Helper method to check if PowerShell is available
   */
  private async hasPowerShell(ssh: SSHClient): Promise<boolean> {
    try {
      await this.executeCommand(ssh, 'powershell -Command "Get-Host"');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper method to check if running with admin privileges
   */
  private async hasAdminPrivileges(ssh: SSHClient): Promise<boolean> {
    try {
      await this.executeCommand(ssh, 'net session >nul 2>&1');
      return true;
    } catch {
      return false;
    }
  }
}
