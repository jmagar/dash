﻿import { useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, User, AuthContextType } from '../context/AuthContext';
import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: string;
      username: string;
      role: string;
      permissions: string[];
    };
  };
  error?: string;
}

interface VerifyResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      username: string;
      role: string;
      permissions: string[];
    };
  };
}

export function useAuth() {
  const navigate = useNavigate();
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { state, dispatch } = context as AuthContextType;

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

      const data: LoginResponse = await response.json();

      if (data.success && data.data) {
        const { token, user } = data.data;
        const userWithPermissions: User = {
          ...user,
          email: undefined, // Optional field
          permissions: user.permissions,
          isAdmin: user.role === 'admin'
        };

        localStorage.setItem('token', token);
        dispatch({ type: 'SET_USER', payload: userWithPermissions });
        dispatch({ type: 'SET_TOKEN', payload: token });

        loggerLoggingManager.getInstance().();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      loggerLoggingManager.getInstance().();
      return { success: false, error: 'Login failed' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        localStorage.removeItem('token');
        dispatch({ type: 'CLEAR_AUTH' });
        navigate('/login');
        loggerLoggingManager.getInstance().();
      } else {
        loggerLoggingManager.getInstance().();
      }
    } catch (error) {
      loggerLoggingManager.getInstance().();
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, navigate, state.token]);

  const verify = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: VerifyResponse = await response.json();

      if (data.success && data.data) {
        const userWithPermissions: User = {
          ...data.data.user,
          email: undefined, // Optional field
          permissions: data.data.user.permissions,
          isAdmin: data.data.user.role === 'admin'
        };

        dispatch({ type: 'SET_USER', payload: userWithPermissions });
        dispatch({ type: 'SET_TOKEN', payload: token });
        loggerLoggingManager.getInstance().();
      } else {
        localStorage.removeItem('token');
        dispatch({ type: 'CLEAR_AUTH' });
        loggerLoggingManager.getInstance().();
      }
    } catch (error) {
      loggerLoggingManager.getInstance().();
      localStorage.removeItem('token');
      dispatch({ type: 'CLEAR_AUTH' });
    }
  }, [dispatch]);

  useEffect(() => {
    void verify();
  }, [verify]);

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    isAdmin,
    login,
    logout,
    verify,
  };
}

