import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Checkbox,
} from '@mui/material';
import React, { useState } from 'react';

import type { Host } from '../types/models';

interface HostSelectorProps {
  hosts: Host[];
  onHostsSelect: (selectedHosts: Host[]) => void;
  multiSelect?: boolean;
}

const HostSelector: React.FC<HostSelectorProps> = ({
  hosts,
  onHostsSelect,
  multiSelect = false,
}) => {
  const [selectedHosts, setSelectedHosts] = useState<Host[]>([]);

  const handleHostSelect = (host: Host): void => {
    let newSelectedHosts: Host[];

    if (multiSelect) {
      newSelectedHosts = selectedHosts.includes(host)
        ? selectedHosts.filter(h => h !== host)
        : [...selectedHosts, host];
    } else {
      newSelectedHosts = [host];
    }

    setSelectedHosts(newSelectedHosts);
    onHostsSelect(newSelectedHosts);
  };

  const handleCheckboxChange = (host: Host): void => {
    handleHostSelect(host);
  };

  return (
    <Box>
      <Typography variant="h6">Select Host(s)</Typography>
      <List>
        {hosts.map((host: Host) => (
          <ListItem
            key={host.id}
            onClick={(): void => handleHostSelect(host)}
            button
          >
            {multiSelect && (
              <Checkbox
                checked={selectedHosts.includes(host)}
                onChange={(): void => handleCheckboxChange(host)}
              />
            )}
            <ListItemText
              primary={host.name}
              secondary={host.hostname}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default HostSelector;
