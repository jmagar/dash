import React, { useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import HostSelector from './HostSelector';
import type { Host } from '../../types';
import { useHost } from '../context/HostContext';
import { logger } from '../utils/frontendLogger';

export default function Navigation(): JSX.Element {
  const location = useLocation();
  const { hosts, selectedHost, selectHost } = useHost();

  const handleSelect = useCallback((selectedHosts: Host[]): void => {
    try {
      if (selectedHosts.length > 0) {
        selectHost(selectedHosts[0]);
        logger.info('Host selected in navigation', { hostId: String(selectedHosts[0].id) });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select host';
      logger.error('Error selecting host:', { error: errorMessage });
    }
  }, [selectHost]);

  const handleDeselect = useCallback((): void => {
    try {
      selectHost(null);
      logger.info('Host deselected in navigation');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deselect host';
      logger.error('Error deselecting host:', { error: errorMessage });
    }
  }, [selectHost]);

  // Auto-select first host if none selected
  useEffect(() => {
    if (!selectedHost && hosts.length > 0) {
      try {
        logger.info('Auto-selecting first host', { hostId: String(hosts[0].id) });
        selectHost(hosts[0]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to auto-select host';
        logger.error('Error auto-selecting host:', { error: errorMessage });
      }
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
          open={true}
          onClose={handleDeselect}
          onSelect={handleSelect}
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
