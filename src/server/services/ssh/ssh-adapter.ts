import type { Host } from '../../../types/host';
import { sshService } from '../ssh.service';

export const executeCommandAdapter = async (
  host: Host, 
  command: string, 
  _options?: { sudo?: boolean }
): Promise<void> => {
  await sshService.executeCommand(host.hostname, command); 
}; 