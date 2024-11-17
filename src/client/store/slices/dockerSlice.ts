import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { DockerContainer } from '../../../types/docker';
import { listContainers, startContainer, stopContainer, removeContainer as removeContainerApi } from '../../api/docker.client';
import { logger } from '../../utils/frontendLogger';
import type { RootState } from '../storeTypes';

interface DockerState {
  containers: DockerContainer[];
  loading: boolean;
  error: string | null;
  selectedContainerId: string | null;
}

const initialState: DockerState = {
  containers: [],
  loading: false,
  error: null,
  selectedContainerId: null,
};

export const fetchContainers = createAsyncThunk<DockerContainer[], string>(
  'docker/fetchContainers',
  async (hostId: string) => {
    try {
      return await listContainers(hostId);
    } catch (error) {
      logger.error('Failed to fetch containers:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
);

export const startContainerThunk = createAsyncThunk<string, { hostId: string; containerId: string }>(
  'docker/startContainer',
  async ({ hostId, containerId }) => {
    try {
      await startContainer(hostId, containerId);
      return containerId;
    } catch (error) {
      logger.error('Failed to start container:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
);

export const stopContainerThunk = createAsyncThunk<string, { hostId: string; containerId: string }>(
  'docker/stopContainer',
  async ({ hostId, containerId }) => {
    try {
      await stopContainer(hostId, containerId);
      return containerId;
    } catch (error) {
      logger.error('Failed to stop container:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
);

export const removeContainerThunk = createAsyncThunk<string, { hostId: string; containerId: string }>(
  'docker/removeContainer',
  async ({ hostId, containerId }) => {
    try {
      await removeContainerApi(hostId, containerId);
      return containerId;
    } catch (error) {
      logger.error('Failed to remove container:', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
);

const dockerSlice = createSlice({
  name: 'docker',
  initialState,
  reducers: {
    selectContainer: (state, action: PayloadAction<string | null>) => {
      state.selectedContainerId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setContainers: (state, action: PayloadAction<DockerContainer[]>) => {
      state.containers = action.payload;
    },
    addContainer: (state, action: PayloadAction<DockerContainer>) => {
      state.containers.push(action.payload);
    },
    updateContainer: (state, action: PayloadAction<DockerContainer>) => {
      const index = state.containers.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.containers[index] = action.payload;
      }
    },
    removeContainer: (state, action: PayloadAction<string>) => {
      state.containers = state.containers.filter(c => c.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContainers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContainers.fulfilled, (state, action) => {
        state.loading = false;
        state.containers = action.payload;
      })
      .addCase(fetchContainers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch containers';
      })
      .addCase(startContainerThunk.fulfilled, (state, action) => {
        const container = state.containers.find(c => c.id === action.payload);
        if (container) {
          container.state = 'running';
        }
      })
      .addCase(stopContainerThunk.fulfilled, (state, action) => {
        const container = state.containers.find(c => c.id === action.payload);
        if (container) {
          container.state = 'exited';
        }
      })
      .addCase(removeContainerThunk.fulfilled, (state, action) => {
        state.containers = state.containers.filter(c => c.id !== action.payload);
        if (state.selectedContainerId === action.payload) {
          state.selectedContainerId = null;
        }
      });
  },
});

export const {
  selectContainer,
  clearError,
  setContainers,
  addContainer,
  updateContainer,
  removeContainer,
  setLoading,
  setError
} = dockerSlice.actions;

export default dockerSlice.reducer;

// Selectors
export const selectAllContainers = (state: RootState): DockerContainer[] =>
  state.docker.containers;

export const selectSelectedContainer = (state: RootState): DockerContainer | null =>
  state.docker.selectedContainerId
    ? state.docker.containers.find((container: DockerContainer) => container.id === state.docker.selectedContainerId) || null
    : null;

export const selectContainerById = (state: RootState, containerId: string): DockerContainer | undefined =>
  state.docker.containers.find((container: DockerContainer) => container.id === containerId);

export const selectIsLoading = (state: RootState): boolean =>
  state.docker.loading;

export const selectError = (state: RootState): string | null =>
  state.docker.error;
