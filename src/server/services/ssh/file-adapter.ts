import type { Host } from '../../../types/host';
import { sshService } from '../ssh.service';

export const fileCopyAdapter = async (
  host: Host,
  sourcePath: string,
  targetPath: string
): Promise<void> => {
  await sshService.transferFile(host.hostname, sourcePath, targetPath);
}; 