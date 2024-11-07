import axios from 'axios';
import { Host, SystemStats, ApiResult } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';

export const getHostStatus = async (): Promise<ApiResult<Host[]>> => {
  try {
    const { data } = await axios.get<Host[]>(`${BASE_URL}${API_ENDPOINTS.HOSTS.STATUS}`);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Host[]>(error);
  }
};

export const getSystemStats = async (hostId: number): Promise<ApiResult<SystemStats>> => {
  try {
    const { data } = await axios.get<SystemStats>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.STATS(hostId)}`
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<SystemStats>(error);
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

export const addHost = async (host: Omit<Host, 'id'>): Promise<ApiResult<Host>> => {
  try {
    const { data } = await axios.post<Host>(`${BASE_URL}${API_ENDPOINTS.HOSTS.LIST}`, host);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Host>(error);
  }
};

export const updateHost = async (hostId: number, host: Partial<Host>): Promise<ApiResult<Host>> => {
  try {
    const { data } = await axios.put<Host>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.LIST}/${hostId}`,
      host
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Host>(error);
  }
};

export const deleteHost = async (hostId: number): Promise<ApiResult<void>> => {
  try {
    await axios.delete(`${BASE_URL}${API_ENDPOINTS.HOSTS.LIST}/${hostId}`);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const testConnection = async (host: Partial<Host>): Promise<ApiResult<void>> => {
  try {
    await axios.post(`${BASE_URL}${API_ENDPOINTS.HOSTS.LIST}/test`, host);
    return {
      success: true,
    };
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const getHostLogs = async (hostId: number): Promise<ApiResult<string[]>> => {
  try {
    const { data } = await axios.get<string[]>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.LIST}/${hostId}/logs`
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<string[]>(error);
  }
};
