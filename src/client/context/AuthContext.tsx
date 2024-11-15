import React, { createContext, useContext, useState, useEffect } from 'react';

import type { AuthenticatedUser, AuthContextType, RefreshTokenResponse } from '../../types/auth';
import { logger } from '../utils/frontendLogger';

interface AuthResponse {
  success: boolean;
  valid?: boolean;
  token?: string;
  refreshToken?: string;
  user?: AuthenticatedUser;
  error?: string;
}

function throwNotInitialized(): never {
  throw new Error('AuthContext not initialized');
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => throwNotInitialized(),
  logout: () => throwNotInitialized(),
  refreshSession: () => throwNotInitialized(),
  loading: true,
  error: null,
});

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async (): Promise<void> => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/auth/validate', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json() as AuthResponse;

        if (data.success && data.valid && data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      } catch (error) {
        logger.error('Token validation failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } finally {
        setLoading(false);
      }
    };

    void validateToken();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json() as AuthResponse;

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.token && data.refreshToken && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      logger.error('Login failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      logger.error('Logout failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const refreshSession = async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json() as RefreshTokenResponse;

      if (!data.success) {
        throw new Error(data.error || 'Failed to refresh session');
      }

      if (data.token && data.refreshToken) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      logger.error('Session refresh failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // If refresh fails, force logout
      await logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshSession, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
