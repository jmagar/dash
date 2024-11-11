import { Edit as EditIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Tab,
  Tabs,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import React, { useState } from 'react';

import DockerCompose from './DockerCompose';
import DockerContainers from './DockerContainers';
import type { Stack } from '../../types';
import { getStacks } from '../api';
import { useAsync } from '../hooks';
import LoadingScreen from './LoadingScreen';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps): JSX.Element {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`docker-tabpanel-${index}`}
      aria-labelledby={`docker-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number): {
  id: string;
  'aria-controls': string;
} {
  return {
    id: `docker-tab-${index}`,
    'aria-controls': `docker-tabpanel-${index}`,
  };
}

export default function DockerManager(): JSX.Element {
  const [value, setValue] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedStack, setSelectedStack] = useState<string>('');

  const loadStacksList = async (): Promise<Stack[]> => {
    const result = await getStacks();
    if (!result.success) {
      throw new Error(result.error || 'Failed to load stacks');
    }
    return result.data || [];
  };

  const {
    data: stacks,
    loading,
    error,
    execute: loadStacks,
  } = useAsync(loadStacksList, { immediate: true });

  const handleChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setValue(newValue);
  };

  const handleNewStack = (): void => {
    setSelectedStack('');
    setComposeOpen(true);
  };

  const handleEditStack = (stackName: string): void => {
    setSelectedStack(stackName);
    setComposeOpen(true);
  };

  const handleCloseCompose = (): void => {
    setComposeOpen(false);
    setSelectedStack('');
  };

  const handleSaveCompose = (): void => {
    void loadStacks();
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="docker management tabs">
          <Tab label="Containers" {...a11yProps(0)} />
          <Tab label="Stacks" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <DockerContainers />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Box sx={{ mb: 2 }}>
          <Button variant="contained" onClick={handleNewStack}>
            New Stack
          </Button>
        </Box>
        {loading ? (
          <LoadingScreen fullscreen={false} message="Loading stacks..." />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <List>
            {stacks?.map((stack) => (
              <ListItem
                key={stack.name}
                secondaryAction={
                  <IconButton edge="end" onClick={(): void => handleEditStack(stack.name)}>
                    <EditIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={stack.name}
                  secondary={`Status: ${stack.status}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </TabPanel>

      <DockerCompose
        stackName={selectedStack}
        open={composeOpen}
        onClose={handleCloseCompose}
        onSave={handleSaveCompose}
      />
    </Box>
  );
}
