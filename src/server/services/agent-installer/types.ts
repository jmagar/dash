import { ExtendedHost, InstallOptions } from '../../../types/agent';

export interface IAgentHandler {
  installAgent(host: ExtendedHost, options: InstallOptions): Promise<void>;
  uninstallAgent(host: ExtendedHost): Promise<void>;
}
