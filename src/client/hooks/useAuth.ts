import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { logger } from '../utils/frontendLogger';

interface User {
  id: string;
  username: string;
  email?: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const navigate = useNavigate();
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { state, dispatch } = context;

  const isAdmin = state.user?.role === 'admin';

  const login = useCallback(async (username: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      const { user, token } = data.data;

      localStorage.setItem('token', token);
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_TOKEN', payload: token });

      logger.info('Login successful:', { username: user.username });
    } catch (error) {
      logger.error('Login failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });
    } catch (error) {
      logger.error('Logout error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      localStorage.removeItem('token');
      dispatch({ type: 'CLEAR_AUTH' });
      navigate('/login');
    }
  }, [state.token, dispatch, navigate]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: 'CLEAR_AUTH' });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.data) {
        dispatch({ type: 'SET_USER', payload: data.data });
        dispatch({ type: 'SET_TOKEN', payload: token });
      } else {
        localStorage.removeItem('token');
        dispatch({ type: 'CLEAR_AUTH' });
      }
    } catch (error) {
      logger.error('Auth verification failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      localStorage.removeItem('token');
      dispatch({ type: 'CLEAR_AUTH' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    isAdmin,
    login,
    logout,
    checkAuth,
  };
}
