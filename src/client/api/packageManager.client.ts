import { BaseApiClient } from './base.client';
import type { Package } from '../../types/models-shared';

const PACKAGE_ENDPOINTS = {
  LIST: (hostId: string) => `/packages/${hostId}/list`,
  INSTALL: (hostId: string) => `/packages/${hostId}/install`,
  UNINSTALL: (hostId: string) => `/packages/${hostId}/uninstall`,
  UPDATE: (hostId: string) => `/packages/${hostId}/update`,
  SEARCH: (hostId: string) => `/packages/${hostId}/search`,
} as const;

class PackageManagerClient extends BaseApiClient {
  constructor() {
    super(PACKAGE_ENDPOINTS);
  }

  async listPackages(hostId: string): Promise<Package[]> {
    const response = await this.get<Package[]>(this.getEndpoint('LIST', hostId));
    return response.data;
  }

  async installPackage(hostId: string, name: string): Promise<void> {
    await this.post<void>(this.getEndpoint('INSTALL', hostId), { name });
  }

  async uninstallPackage(hostId: string, name: string): Promise<void> {
    await this.post<void>(this.getEndpoint('UNINSTALL', hostId), { name });
  }

  async updatePackage(hostId: string, name: string): Promise<void> {
    await this.post<void>(this.getEndpoint('UPDATE', hostId), { name });
  }

  async searchPackages(hostId: string, query: string): Promise<Package[]> {
    const response = await this.get<Package[]>(this.getEndpoint('SEARCH', hostId), {
      params: { query },
    });
    return response.data;
  }
}

export const packageManagerClient = new PackageManagerClient();
export const { listPackages, installPackage, uninstallPackage, updatePackage, searchPackages } = packageManagerClient;
