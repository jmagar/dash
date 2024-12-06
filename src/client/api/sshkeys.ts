import { BaseApiClient, type Endpoint } from './base.client';
import { KeyDistributionStatus } from '../types/sshkeys';

type SSHKeysEndpoints = Record<string, Endpoint> & {
  STATUS: '/api/sshkeys/status';
  DISTRIBUTE: '/api/sshkeys/distribute';
};

const SSH_KEYS_ENDPOINTS: SSHKeysEndpoints = {
  STATUS: '/api/sshkeys/status',
  DISTRIBUTE: '/api/sshkeys/distribute',
};

class SSHKeysClient extends BaseApiClient<SSHKeysEndpoints> {
  private static instance: SSHKeysClient;

  private constructor() {
    super(SSH_KEYS_ENDPOINTS);
  }

  public static getInstance(): SSHKeysClient {
    if (!SSHKeysClient.instance) {
      SSHKeysClient.instance = new SSHKeysClient();
    }
    return SSHKeysClient.instance;
  }

  async getKeyStatus(): Promise<KeyDistributionStatus> {
    const response = await this.get<KeyDistributionStatus>(
      this.getEndpoint('STATUS')
    );

    if (!response.data) {
      throw new Error('Failed to get SSH key status');
    }

    return response.data;
  }

  async initiateKeyDistribution(): Promise<void> {
    const response = await this.post<void>(
      this.getEndpoint('DISTRIBUTE')
    );

    if (!response.data) {
      throw new Error('Failed to initiate SSH key distribution');
    }
  }
}

export const sshKeysClient = SSHKeysClient.getInstance();
export const { getKeyStatus, initiateKeyDistribution } = sshKeysClient;
