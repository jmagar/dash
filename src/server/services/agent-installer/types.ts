import type { Host } from '../../../types/host';
import type { InstallOptions } from '../../../types/agent';

export interface IAgentHandler {
  installAgent(host: Host, options: InstallOptions): Promise<void>;
  uninstallAgent(host: Host): Promise<void>;
  startAgent(host: Host): Promise<void>;
  stopAgent(host: Host): Promise<void>;
  getInstallScript(): string;
}
