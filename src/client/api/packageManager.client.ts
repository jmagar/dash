import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';
import type { Package } from '../../types/models-shared';

type PackageManagerEndpoints = Record<string, Endpoint> & {
  LIST: Endpoint;
  INSTALL: Endpoint;
  UNINSTALL: Endpoint;
  UPDATE: Endpoint;
  SEARCH: Endpoint;
};

const PACKAGE_ENDPOINTS: PackageManagerEndpoints = {
  LIST: (...args: EndpointParams[]) => `/packages/${args[0]}/list`,
  INSTALL: (...args: EndpointParams[]) => `/packages/${args[0]}/install`,
  UNINSTALL: (...args: EndpointParams[]) => `/packages/${args[0]}/uninstall`,
  UPDATE: (...args: EndpointParams[]) => `/packages/${args[0]}/update`,
  SEARCH: (...args: EndpointParams[]) => `/packages/${args[0]}/search`,
};

class PackageManagerClient extends BaseApiClient<PackageManagerEndpoints> {
  constructor() {
    super(PACKAGE_ENDPOINTS);
  }

  async listPackages(hostId: string): Promise<Package[]> {
    const response = await this.get<Package[]>(
      this.getEndpoint('LIST', hostId)
    );

    if (!response.data) {
      throw new Error('Failed to list packages');
    }

    return response.data;
  }

  async installPackage(hostId: string, name: string): Promise<void> {
    const response = await this.post<void>(
      this.getEndpoint('INSTALL', hostId),
      { name }
    );

    if (!response.data) {
      throw new Error(`Failed to install package: ${name}`);
    }
  }

  async uninstallPackage(hostId: string, name: string): Promise<void> {
    const response = await this.post<void>(
      this.getEndpoint('UNINSTALL', hostId),
      { name }
    );

    if (!response.data) {
      throw new Error(`Failed to uninstall package: ${name}`);
    }
  }

  async updatePackage(hostId: string, name: string): Promise<void> {
    const response = await this.post<void>(
      this.getEndpoint('UPDATE', hostId),
      { name }
    );

    if (!response.data) {
      throw new Error(`Failed to update package: ${name}`);
    }
  }

  async searchPackages(hostId: string, query: string): Promise<Package[]> {
    const response = await this.get<Package[]>(
      this.getEndpoint('SEARCH', hostId),
      {
        params: { query },
      }
    );

    if (!response.data) {
      throw new Error('Failed to search packages');
    }

    return response.data;
  }
}

export const packageManagerClient = new PackageManagerClient();
export const { listPackages, installPackage, uninstallPackage, updatePackage, searchPackages } = packageManagerClient;
