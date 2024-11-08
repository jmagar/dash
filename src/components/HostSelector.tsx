import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Modal,
  Button,
} from '@mui/material';
import React, { useState } from 'react';

import type { Host } from '../types/models';

interface HostSelectorProps {
  onSelect: (hosts: Host[]) => void;
  multiSelect?: boolean;
  open?: boolean;
  onClose?: () => void;
  hosts?: Host[];
}

const HostSelector: React.FC<HostSelectorProps> = ({
  onSelect,
  multiSelect = false,
  open = false,
  onClose,
  hosts = [],
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
    onSelect(newSelectedHosts);
  };

  const handleCheckboxChange = (host: Host): void => {
    handleHostSelect(host);
  };

  const handleConfirm = (): void => {
    onSelect(selectedHosts);
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
      }}>
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
        {multiSelect && (
          <Button
            variant="contained"
            onClick={handleConfirm}
          >
            Confirm Selection
          </Button>
        )}
      </Box>
    </Modal>
  );
};

export default HostSelector;
