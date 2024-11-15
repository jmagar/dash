import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthenticatedUser } from '../../types/auth';
import { validate } from '../api/auth.client';
import { logger } from '../utils/logger';

interface AuthState {
  token: string | null;
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
}

interface AuthContextType {
  authState: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await validate();
        if (response.valid && response.user) {
          setAuthState({
            token: localStorage.getItem('token'),
            user: response.user,
            isAuthenticated: true,
          });
        } else {
          // Clear invalid token
          localStorage.removeItem('token');
          setAuthState(initialState);
        }
      } catch (err) {
        logger.error('Token validation failed:', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        localStorage.removeItem('token');
        setAuthState(initialState);
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('token');
    if (token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ authState, setAuthState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
