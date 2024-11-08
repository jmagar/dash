import axios from 'axios';

import type { Host, ApiResult, SystemStats } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';

export const getHostStatus = async (): Promise<ApiResult<Host[]>> => {
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

export const addHost = async (hostData: Partial<Host>): Promise<ApiResult<Host>> => {
  try {
    const { data } = await axios.post<Host>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.ADD}`,
      hostData,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Host>(error);
  }
};

export const testConnection = async (hostData: Partial<Host>): Promise<ApiResult<boolean>> => {
  try {
    const { data } = await axios.post<boolean>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.TEST_CONNECTION}`,
      hostData,
    );
    return {
      success: true,
      data,
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

export const connectHost = async (hostId: number): Promise<ApiResult<Host>> => {
  try {
    const { data } = await axios.post<Host>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.CONNECT(hostId)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Host>(error);
  }
};

export const disconnectHost = async (hostId: number): Promise<ApiResult<Host>> => {
  try {
    const { data } = await axios.post<Host>(
      `${BASE_URL}${API_ENDPOINTS.HOSTS.DISCONNECT(hostId)}`,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<Host>(error);
  }
};
