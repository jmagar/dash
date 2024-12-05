import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useSSHKeys } from '../hooks/useSSHKeys';
import { KeyDistributionStatus } from '../types/sshkeys';

const SSHKeyManager: React.FC = () => {
    const { status, initiateDistribution } = useSSHKeys();
    const [isDistributing, setIsDistributing] = useState(false);

    const handleDistribute = async () => {
        setIsDistributing(true);
        try {
            await initiateDistribution();
        } catch (error) {
            console.error('Failed to initiate key distribution:', error);
        }
        setIsDistributing(false);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                SSH Key Distribution
            </Typography>

            <Box sx={{ mb: 3 }}>
                <Button
                    variant="contained"
                    onClick={handleDistribute}
                    disabled={isDistributing || status?.status === 'Starting'}
                >
                    {isDistributing ? 'Distributing...' : 'Distribute SSH Keys'}
                </Button>
            </Box>

            {status && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Status: {status.status}
                    </Typography>
                    <Typography color="textSecondary" gutterBottom>
                        {status.details}
                    </Typography>
                    
                    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                        <CircularProgress variant="determinate" value={status.progress} />
                        <Box
                            sx={{
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Typography variant="caption" component="div" color="text.secondary">
                                {`${Math.round(status.progress)}%`}
                            </Typography>
                        </Box>
                    </Box>

                    <Typography variant="h6" gutterBottom>
                        Agent Status
                    </Typography>
                    {Array.from(status.agentKeys.entries()).map(([agentId, agentStatus]) => (
                        <Box key={agentId} sx={{ mb: 1 }}>
                            <Typography>
                                Agent {agentId}: {agentStatus}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default SSHKeyManager;
