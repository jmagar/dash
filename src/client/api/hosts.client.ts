import axios from 'axios';

import { ApiResult, Host, SystemStats } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';

export const listHosts = async (): Promise<ApiResult<Host[]>> => {
  try {
    const { data } = await axios.get<Host[]>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.LIST}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Host[]>(error);
  }
};

export const getHostStatus = async (hostId: number): Promise<ApiResult<boolean>> => {
  try {
    const { data } = await axios.get<{ connected: boolean }>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.STATUS}/${hostId}`,
    );
    return {
      success: true,
      data: data.connected,
    };
  } catch (error) {
    return handleApiError<boolean>(error);
  }
};

export const getSystemStats = async (hostId: number): Promise<ApiResult<SystemStats>> => {
  try {
    const { data } = await axios.get<SystemStats>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.STATS(hostId)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<SystemStats>(error);
  }
};

export const addHost = async (host: Omit<Host, 'id'>): Promise<ApiResult<Host>> => {
  try {
    const { data } = await axios.post<Host>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.ADD}`,
      host,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Host>(error);
  }
};

export const removeHost = async (hostId: number): Promise<ApiResult<void>> => {
  try {
    await axios.delete(`${BASE_URL}${API_ENDPOINTS.HOSTS.REMOVE(hostId)}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const testConnection = async (host: Partial<Host>): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.HOSTS.TEST_CONNECTION}`, host);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const connectHost = async (hostId: number): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.HOSTS.CONNECT(hostId)}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const disconnectHost = async (hostId: number): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.HOSTS.DISCONNECT(hostId)}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};
