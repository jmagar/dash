import { KeyDistributionStatus } from '../types/sshkeys';
import { apiClient } from './client';

export const getKeyStatus = async (): Promise<KeyDistributionStatus> => {
    const response = await apiClient.get('/api/sshkeys/status');
    return response.data;
};

export const initiateKeyDistribution = async (): Promise<void> => {
    await apiClient.post('/api/sshkeys/distribute');
};
