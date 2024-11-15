import React, { createContext, useContext, useState, useEffect } from 'react';

import type { User, AuthContextType } from '../../types/auth';
import { logger } from '../utils/frontendLogger';

interface AuthResponse {
  success: boolean;
  valid?: boolean;
  token?: string;
  user?: User;
  error?: string;
}

function throwNotInitialized(): never {
  throw new Error('AuthContext not initialized');
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => throwNotInitialized(),
  logout: () => throwNotInitialized(),
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
  const [user, setUser] = useState<User | null>(null);
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
        }
      } catch (error) {
        logger.error('Token validation failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        localStorage.removeItem('token');
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

      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
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
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      logger.error('Logout failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
