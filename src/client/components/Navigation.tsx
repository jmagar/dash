import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHost } from '../context/HostContext';
import { useAuth } from '../context/AuthContext';
import { logout } from '../api/auth.client';
import { logger } from '../utils/logger';

export function Navigation() {
  const navigate = useNavigate();
  const { authState, setAuthState } = useAuth();
  const { selectedHost, setSelectedHost } = useHost();

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('token');
      setAuthState({
        token: null,
        user: null,
        isAuthenticated: false,
      });
      setSelectedHost(null);
      navigate('/login');
    } catch (err) {
      logger.error('Failed to logout:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-left">
        <button onClick={() => navigate('/')}>Dashboard</button>
        <button onClick={() => navigate('/execute')}>Execute</button>
        <button onClick={() => navigate('/files')}>Files</button>
      </div>
      <div className="nav-right">
        {selectedHost && (
          <span className="host-info">
            Connected to: {selectedHost.name}
          </span>
        )}
        {authState.user && (
          <>
            <span className="user-info">
              {authState.user.username} ({authState.user.role})
            </span>
            <button onClick={() => navigate('/profile')}>Profile</button>
          </>
        )}
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
