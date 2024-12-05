import { useState, useEffect } from 'react';
import { KeyDistributionStatus } from '../types/sshkeys';
import { getKeyStatus, initiateKeyDistribution } from '../api/sshkeys';
import { useSocket } from './useSocket';

export const useSSHKeys = () => {
    const [status, setStatus] = useState<KeyDistributionStatus | null>(null);
    const socket = useSocket();

    useEffect(() => {
        // Initial status fetch
        const fetchStatus = async () => {
            try {
                const currentStatus = await getKeyStatus();
                setStatus(currentStatus);
            } catch (error) {
                console.error('Failed to fetch SSH key status:', error);
            }
        };
        fetchStatus();

        // Listen for status updates via WebSocket
        socket?.on('ssh_key_status', (newStatus: KeyDistributionStatus) => {
            setStatus(newStatus);
        });

        return () => {
            socket?.off('ssh_key_status');
        };
    }, [socket]);

    const initiateDistribution = async () => {
        await initiateKeyDistribution();
    };

    return {
        status,
        initiateDistribution,
    };
};
