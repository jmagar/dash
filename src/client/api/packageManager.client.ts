import axios from 'axios';

import type { ApiResult } from '../../types';
import { API_ENDPOINTS } from '../../types/api-shared';
import { handleApiError } from '../../types/error';
import { BASE_URL } from '../config';

export interface Package {
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  updateAvailable?: boolean;
}

export async function listInstalledPackages(hostId: number): Promise<ApiResult<Package[]>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.PACKAGES.LIST(hostId)}`);
    return response.data;
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
}

export async function searchPackages(
  hostId: number,
  query: string,
): Promise<ApiResult<Package[]>> {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.PACKAGES.SEARCH(hostId)}`, {
      params: { query },
    });
    return response.data;
  } catch (error) {
    return handleApiError<Package[]>(error);
  }
}

export async function installPackage(
  hostId: number,
  packageName: string,
): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.PACKAGES.INSTALL(hostId)}`, {
      name: packageName,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function uninstallPackage(
  hostId: number,
  packageName: string,
): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.PACKAGES.UNINSTALL(hostId)}`, {
      name: packageName,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function updatePackage(
  hostId: number,
  packageName: string,
): Promise<ApiResult<void>> {
  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.PACKAGES.UPDATE(hostId)}`, {
      name: packageName,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function getPackageInfo(
  hostId: number,
  packageName: string,
): Promise<ApiResult<Package>> {
  try {
    const response = await axios.get(
      `${BASE_URL}${API_ENDPOINTS.PACKAGES.INFO(hostId, packageName)}`,
    );
    return response.data;
  } catch (error) {
    return handleApiError<Package>(error);
  }
}
