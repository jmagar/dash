import type { DockerContainer, DockerStats } from '@/types/docker';
import { logger } from '@/client/utils/frontendLogger';
import { config } from '@/client/config';

const BASE_URL = `${config.apiUrl}/docker`;

export async function listContainers(hostId: string): Promise<DockerContainer[]> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/containers`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to list containers');
    }
    return data.data.map((container: any) => ({
      ...container,
      name: container.names ? container.names[0].replace(/^\//, '') : container.name || '',
      created: new Date(container.created * 1000),
    }));
  } catch (error) {
    logger.error('Failed to list containers:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getContainerStats(hostId: string, containerId: string): Promise<DockerStats> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/containers/${containerId}/stats`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get container stats');
    }
    return data.data;
  } catch (error) {
    logger.error('Failed to get container stats:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function startContainer(hostId: string, containerId: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/containers/${containerId}/start`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to start container');
    }
  } catch (error) {
    logger.error('Failed to start container:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function stopContainer(hostId: string, containerId: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/containers/${containerId}/stop`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to stop container');
    }
  } catch (error) {
    logger.error('Failed to stop container:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function restartContainer(hostId: string, containerId: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/containers/${containerId}/restart`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to restart container');
    }
  } catch (error) {
    logger.error('Failed to restart container:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function removeContainer(hostId: string, containerId: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/containers/${containerId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to remove container');
    }
  } catch (error) {
    logger.error('Failed to remove container:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function listNetworks(hostId: string): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/networks`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to list networks');
    }
    return data.data;
  } catch (error) {
    logger.error('Failed to list networks:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function listVolumes(hostId: string): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/volumes`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to list volumes');
    }
    return data.data;
  } catch (error) {
    logger.error('Failed to list volumes:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getContainerLogs(hostId: string, containerId: string): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/containers/${containerId}/logs`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get container logs');
    }
    return data.data;
  } catch (error) {
    logger.error('Failed to get container logs:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getStacks(hostId: string): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/stacks`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get stacks');
    }
    return data.data;
  } catch (error) {
    logger.error('Failed to get stacks:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function createStack(hostId: string, name: string, composeFile: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/stacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, composeFile }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create stack');
    }
  } catch (error) {
    logger.error('Failed to create stack:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function deleteStack(hostId: string, stackName: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/stacks/${stackName}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete stack');
    }
  } catch (error) {
    logger.error('Failed to delete stack:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function startStack(hostId: string, stackName: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/stacks/${stackName}/start`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to start stack');
    }
  } catch (error) {
    logger.error('Failed to start stack:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function stopStack(hostId: string, stackName: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/stacks/${stackName}/stop`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to stop stack');
    }
  } catch (error) {
    logger.error('Failed to stop stack:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getStackComposeFile(hostId: string, stackName: string): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/stacks/${stackName}/compose`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get stack compose file');
    }
    return data.data;
  } catch (error) {
    logger.error('Failed to get stack compose file:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function updateStackComposeFile(hostId: string, stackName: string, composeFile: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/${hostId}/stacks/${stackName}/compose`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ composeFile }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to update stack compose file');
    }
  } catch (error) {
    logger.error('Failed to update stack compose file:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
