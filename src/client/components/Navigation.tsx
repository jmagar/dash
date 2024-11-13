import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { HostSelector } from './HostSelector';
import type { Host } from '../../types';
import { useHost } from '../context/HostContext';
import { logger } from '../utils/frontendLogger';

export function Navigation(): JSX.Element {
  const location = useLocation();
  const { hosts, selectedHost, selectHost } = useHost();

  const handleSelect = React.useCallback((host: Host): void => {
    selectHost(host);
    logger.info('Host selected', { hostId: String(host.id) });
  }, [selectHost]);

  const handleDeselect = React.useCallback((): void => {
    selectHost(null);
    logger.info('Host deselected');
  }, [selectHost]);

  // Auto-select first host if none selected
  React.useEffect(() => {
    if (!selectedHost && hosts.length > 0) {
      logger.info('Auto-selecting first host', { hostId: String(hosts[0].id) });
      selectHost(hosts[0]);
    }
  }, [hosts, selectedHost, selectHost]);

  return (
    <nav className="navigation">
      <div className="nav-header">
        <Link to="/" className="logo">
          SSH Dashboard
        </Link>
        <HostSelector
          hosts={hosts}
          selectedHost={selectedHost}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
        />
      </div>
      <div className="nav-links">
        <Link
          to="/"
          className={location.pathname === '/' ? 'active' : ''}
        >
          Dashboard
        </Link>
        <Link
          to="/files"
          className={location.pathname === '/files' ? 'active' : ''}
        >
          Files
        </Link>
        <Link
          to="/docker"
          className={location.pathname === '/docker' ? 'active' : ''}
        >
          Docker
        </Link>
        <Link
          to="/packages"
          className={location.pathname === '/packages' ? 'active' : ''}
        >
          Packages
        </Link>
        <Link
          to="/terminal"
          className={location.pathname === '/terminal' ? 'active' : ''}
        >
          Terminal
        </Link>
      </div>
    </nav>
  );
}
