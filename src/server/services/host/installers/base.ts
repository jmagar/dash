import { Client as SSHClient } from 'ssh2';
import type { Host } from '../../../../types/host';
import type { InstallOptions, AgentInstaller } from '../host.types';

export abstract class BaseInstaller implements AgentInstaller {
  protected async executeCommand(ssh: SSHClient, command: string): Promise<string> {
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

  protected async copyFile(ssh: SSHClient, source: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ssh.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        const readStream = sftp.createReadStream(source);
        const writeStream = sftp.createWriteStream(dest);

        writeStream.on('close', () => {
          resolve();
        });

        writeStream.on('error', (error) => {
          reject(error);
        });

        readStream.pipe(writeStream);
      });
    });
  }

  abstract install(host: Host, ssh: SSHClient, options: InstallOptions): Promise<void>;
  abstract uninstall(host: Host, ssh: SSHClient): Promise<void>;
  abstract upgrade(host: Host, ssh: SSHClient, version: string): Promise<void>;
}
