import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '../types';
import type { Container, DockerState, ContainerUpdate } from './types/docker';
import type { LogMetadata } from '../../../types/logger';
import {
  getContainers,
  startContainer,
  stopContainer,
  removeContainer,
} from '../../api/docker.client';
import { logger } from '../../utils/frontendLogger';

const initialState: DockerState = {
  containers: {},
  loading: false,
  error: null,
  selectedContainerId: null,
};

// Async thunks
export const fetchContainers = createAsyncThunk<
  Container[],
  void,
  {
    rejectValue: string;
    state: RootState;
  }
>('docker/fetchContainers', async (_, { rejectWithValue }) => {
  try {
    const response = await getContainers();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch containers');
    }
    return response.data.map(container => ({
      ...container,
      state: container.state as Container['state'],
    }));
  } catch (error) {
    const metadata: LogMetadata = {
      component: 'DockerSlice',
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
    logger.error('Failed to fetch containers:', metadata);
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch containers');
  }
});

export const startDockerContainer = createAsyncThunk<
  string,
  string,
  {
    rejectValue: string;
    state: RootState;
  }
>('docker/startContainer', async (containerId, { rejectWithValue }) => {
  try {
    const response = await startContainer(containerId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to start container');
    }
    return containerId;
  } catch (error) {
    const metadata: LogMetadata = {
      component: 'DockerSlice',
      containerId,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
    logger.error('Failed to start container:', metadata);
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to start container');
  }
});

export const stopDockerContainer = createAsyncThunk<
  string,
  string,
  {
    rejectValue: string;
    state: RootState;
  }
>('docker/stopContainer', async (containerId, { rejectWithValue }) => {
  try {
    const response = await stopContainer(containerId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to stop container');
    }
    return containerId;
  } catch (error) {
    const metadata: LogMetadata = {
      component: 'DockerSlice',
      containerId,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
    logger.error('Failed to stop container:', metadata);
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to stop container');
  }
});

export const removeDockerContainer = createAsyncThunk<
  string,
  string,
  {
    rejectValue: string;
    state: RootState;
  }
>('docker/removeContainer', async (containerId, { rejectWithValue }) => {
  try {
    const response = await removeContainer(containerId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to remove container');
    }
    return containerId;
  } catch (error) {
    const metadata: LogMetadata = {
      component: 'DockerSlice',
      containerId,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
    logger.error('Failed to remove container:', metadata);
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to remove container');
  }
});

const dockerSlice = createSlice({
  name: 'docker',
  initialState,
  reducers: {
    selectContainer: (state: DockerState, action: PayloadAction<string | null>): void => {
      state.selectedContainerId = action.payload;
    },
    clearError: (state: DockerState): void => {
      state.error = null;
    },
    updateContainerState: (
      state: DockerState,
      action: PayloadAction<ContainerUpdate>,
    ): void => {
      const { containerId, updates } = action.payload;
      if (state.containers[containerId]) {
        state.containers[containerId] = {
          ...state.containers[containerId],
          ...updates,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch containers
      .addCase(fetchContainers.pending, (state: DockerState): void => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContainers.fulfilled, (state: DockerState, action: PayloadAction<Container[]>): void => {
        state.loading = false;
        state.containers = action.payload.reduce<Record<string, Container>>((acc, container) => {
          acc[container.id] = container;
          return acc;
        }, {});
      })
      .addCase(fetchContainers.rejected, (state: DockerState, action): void => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch containers';
      })
      // Start container
      .addCase(startDockerContainer.pending, (state: DockerState, action): void => {
        const containerId = action.meta.arg;
        if (state.containers[containerId]) {
          state.containers[containerId] = {
            ...state.containers[containerId],
            state: 'starting',
          };
        }
      })
      .addCase(startDockerContainer.fulfilled, (state: DockerState, action): void => {
        const containerId = action.payload;
        if (state.containers[containerId]) {
          state.containers[containerId] = {
            ...state.containers[containerId],
            state: 'running',
          };
        }
      })
      .addCase(startDockerContainer.rejected, (state: DockerState, action): void => {
        const containerId = action.meta.arg;
        if (state.containers[containerId]) {
          state.containers[containerId] = {
            ...state.containers[containerId],
            state: 'error',
          };
        }
        state.error = action.payload || 'Failed to start container';
      })
      // Stop container
      .addCase(stopDockerContainer.pending, (state: DockerState, action): void => {
        const containerId = action.meta.arg;
        if (state.containers[containerId]) {
          state.containers[containerId] = {
            ...state.containers[containerId],
            state: 'stopping',
          };
        }
      })
      .addCase(stopDockerContainer.fulfilled, (state: DockerState, action): void => {
        const containerId = action.payload;
        if (state.containers[containerId]) {
          state.containers[containerId] = {
            ...state.containers[containerId],
            state: 'stopped',
          };
        }
      })
      .addCase(stopDockerContainer.rejected, (state: DockerState, action): void => {
        const containerId = action.meta.arg;
        if (state.containers[containerId]) {
          state.containers[containerId] = {
            ...state.containers[containerId],
            state: 'error',
          };
        }
        state.error = action.payload || 'Failed to stop container';
      })
      // Remove container
      .addCase(removeDockerContainer.fulfilled, (state: DockerState, action): void => {
        const containerId = action.payload;
        delete state.containers[containerId];
        if (state.selectedContainerId === containerId) {
          state.selectedContainerId = null;
        }
      });
  },
});

// Export actions and reducer
export const { selectContainer, clearError, updateContainerState } = dockerSlice.actions;
export default dockerSlice.reducer;

// Selectors
export const selectAllContainers = (state: RootState): Container[] =>
  Object.values(state.docker.containers);

export const selectSelectedContainer = (state: RootState): Container | null =>
  state.docker.selectedContainerId ? state.docker.containers[state.docker.selectedContainerId] : null;

export const selectContainerById = (state: RootState, containerId: string): Container | undefined =>
  state.docker.containers[containerId];

export const selectIsLoading = (state: RootState): boolean =>
  state.docker.loading;

export const selectError = (state: RootState): string | null =>
  state.docker.error;
