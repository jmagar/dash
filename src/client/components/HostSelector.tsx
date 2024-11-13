import React, { useCallback } from 'react';

import type { Host } from '../../types';
import { logger } from '../utils/frontendLogger';

interface HostSelectorProps {
  hosts: Host[];
  open: boolean;
  onClose: () => void;
  onSelect: (hosts: Host[]) => void;
  multiSelect?: boolean;
}

export default function HostSelector({
  hosts,
  open,
  onClose,
  onSelect,
  multiSelect = false,
}: HostSelectorProps): JSX.Element {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const hostId = event.target.value;
    if (hostId === '') {
      onClose();
      logger.info('Host deselected');
      return;
    }

    const host = hosts.find((h: Host) => String(h.id) === hostId);
    if (host) {
      onSelect([host]);
      logger.info('Host selected', { hostId: String(host.id) });
    }
  }, [hosts, onSelect, onClose]);

  if (!open) {
    return <></>;
  }

  return (
    <select
      value=""
      onChange={handleChange}
      className="host-selector"
    >
      <option value="">Select a host...</option>
      {hosts.map((host: Host) => (
        <option key={host.id} value={host.id}>
          {host.name} ({host.hostname})
        </option>
      ))}
    </select>
  );
}
