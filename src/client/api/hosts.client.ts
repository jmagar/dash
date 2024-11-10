import axios from 'axios';

import { ApiResult, Host, SystemStats } from '../../types';
import { handleApiError, API_ENDPOINTS } from '../../types/api-shared';
import { BASE_URL } from '../config';

export async function listHosts(): Promise<ApiResult<Host[]>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.HOSTS.LIST}`);
    return response.data;
  } catch (error) {
    return handleApiError<Host[]>(error);
  }
}

export async function addHost(host: Omit<Host, 'id'>): Promise<ApiResult<Host>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.HOSTS.ADD}`, host);
    return response.data;
  } catch (error) {
    return handleApiError<Host>(error);
  }
}

export async function removeHost(id: number): Promise<ApiResult<void>> {
  try {
    const response = await axios.delete(`${BASE_URL}${API_ENDPOINTS.HOSTS.REMOVE(id)}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function getHostStatus(id: number): Promise<ApiResult<boolean>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.HOSTS.STATUS}/${id}`);
    return response.data;
  } catch (error) {
    return handleApiError<boolean>(error);
  }
}

export async function testConnection(host: Omit<Host, 'id'>): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.HOSTS.TEST}`, host);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function getSystemStats(id: number): Promise<ApiResult<SystemStats>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.HOSTS.STATS(id)}`);
    return response.data;
  } catch (error) {
    return handleApiError<SystemStats>(error);
  }
}

export async function connectHost(id: number): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.HOSTS.CONNECT(id)}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function disconnectHost(id: number): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.HOSTS.DISCONNECT(id)}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}
