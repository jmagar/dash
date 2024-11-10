import LayersIcon from '@mui/icons-material/Layers';
import ViewListIcon from '@mui/icons-material/ViewList';
import {
  Box,
  Tab,
  Tabs,
} from '@mui/material';
import React, { useState } from 'react';

import DockerCompose from './DockerCompose';
import DockerContainers from './DockerContainers';

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
      {value === index && <Box>{children}</Box>}
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

  const handleChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="Docker management tabs"
        >
          <Tab
            icon={<ViewListIcon />}
            iconPosition="start"
            label="Containers"
            {...a11yProps(0)}
          />
          <Tab
            icon={<LayersIcon />}
            iconPosition="start"
            label="Compose Stacks"
            {...a11yProps(1)}
          />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <DockerContainers />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <DockerCompose />
      </TabPanel>
    </Box>
  );
}
