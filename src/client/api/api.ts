import axios from 'axios';
import { logger } from '../utils/logger';

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logger.error('API request error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error('API response error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);
