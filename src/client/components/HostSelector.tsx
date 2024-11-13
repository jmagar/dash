import React, { useCallback } from 'react';

import type { Host } from '../../types';
import { logger } from '../utils/frontendLogger';

interface HostSelectorProps {
  hosts: Host[];
  selectedHost: Host | null;
  onSelect: (host: Host) => void;
  onDeselect: () => void;
}

export function HostSelector({
  hosts,
  selectedHost,
  onSelect,
  onDeselect,
}: HostSelectorProps): JSX.Element {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const hostId = event.target.value;
    if (hostId === '') {
      onDeselect();
      logger.info('Host deselected');
      return;
    }

    const host = hosts.find(h => String(h.id) === hostId);
    if (host) {
      onSelect(host);
      logger.info('Host selected', { hostId: String(host.id) });
    }
  }, [hosts, onSelect, onDeselect]);

  return (
    <select
      value={selectedHost?.id || ''}
      onChange={handleChange}
      className="host-selector"
    >
      <option value="">Select a host...</option>
      {hosts.map(host => (
        <option key={host.id} value={host.id}>
          {host.name} ({host.hostname})
        </option>
      ))}
    </select>
  );
}
