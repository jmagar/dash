import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';

import SetupWizard from './SetupWizard';

export default function WelcomeCard(): JSX.Element {
  const [setupOpen, setSetupOpen] = useState(false);
  const theme = useTheme();

  const handleOpenSetup = (): void => {
    setSetupOpen(true);
  };

  const handleCloseSetup = (): void => {
    setSetupOpen(false);
  };

  return (
    <>
      <Card
        sx={{
          maxWidth: 800,
          mx: 'auto',
          mt: 4,
          borderRadius: 2,
          boxShadow: theme.shadows[3],
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom color="primary">
            Welcome to SSH Remote Management
          </Typography>

          <Typography variant="h6" color="text.secondary" paragraph>
            Your centralized solution for managing remote servers
          </Typography>

          <Box sx={{ my: 3 }}>
            <Typography variant="body1" paragraph>
              Get started by connecting to your first SSH host. With SSH Remote Management, you can:
            </Typography>

            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                Monitor system resources and performance in real-time
              </Typography>
              <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                Manage files and directories with an intuitive interface
              </Typography>
              <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                Execute remote commands and scripts securely
              </Typography>
              <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                Manage Docker containers and services
              </Typography>
              <Typography component="li" variant="body1">
                Install and update packages across your servers
              </Typography>
            </Box>
          </Box>
        </CardContent>

        <CardActions sx={{ p: 4, pt: 0 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleOpenSetup}
          >
            Add Your First Host
          </Button>
        </CardActions>
      </Card>

      <SetupWizard open={setupOpen} onClose={handleCloseSetup} />
    </>
  );
}
