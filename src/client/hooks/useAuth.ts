import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types/models-shared';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const navigate = useNavigate();

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/validate', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to validate session');
        }

        const data = await response.json();
        if (data.success && data.data) {
          setState({
            user: data.data,
            loading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            loading: false,
            error: data.error || 'Invalid session',
          });
        }
      } catch (error) {
        setState({
          user: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load user',
        });
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success && data.data) {
        setState({
          user: data.data,
          loading: false,
          error: null,
        });
        navigate('/');
        return true;
      } else {
        setState(prev => ({
          ...prev,
          error: data.error || 'Invalid credentials',
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to login',
      }));
      return false;
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setState({
        user: null,
        loading: false,
        error: null,
      });
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }, [navigate]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    logout,
  };
}
