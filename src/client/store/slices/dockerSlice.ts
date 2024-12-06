import { createSlice, createAsyncThunk, PayloadAction, Slice } from '@reduxjs/toolkit';
import type { DockerContainer, ContainerState } from '../../../types/docker';
import type { RootState, DockerState, ContainerUpdate } from '../storeTypes';
import { listContainers, startContainer, stopContainer, removeContainer as removeContainerApi } from '../../api/docker.client';
import { logger } from '../../utils/frontendLogger';

const initialState: DockerState = {
  containers: [],
  loading: false,
  error: null,
  selectedContainerId: null,
};

interface RawContainer {
  id?: string;
  name?: string;
  image?: string;
  command?: string | string[];
  created?: string;
  status?: string;
  ports?: Array<{
    hostPort?: number;
    containerPort?: number;
    protocol?: string;
  }>;
  env?: Array<{
    key?: string;
    value?: string;
  }>;
}

const createDockerContainer = (raw: RawContainer): DockerContainer => {
  const container: DockerContainer = {
    id: raw.id ?? crypto.randomUUID(),
    name: raw.name ?? 'unnamed',
    image: raw.image ?? 'unknown',
    command: Array.isArray(raw.command) ? raw.command : [raw.command ?? ''],
    created: raw.created ?? new Date().toISOString(),
    state: (raw.status ?? 'unknown') as ContainerState,
    status: raw.status ?? 'unknown',
    ports: (raw.ports ?? []).map(p => ({
      hostPort: p.hostPort ?? 0,
      containerPort: p.containerPort ?? 0,
      protocol: p.protocol ?? 'tcp'
    })),
    env: (raw.env ?? []).map(e => ({
      key: e.key ?? '',
      value: e.value ?? ''
    })),
    hostId: 'default'
  };
  return container;
};

export const fetchContainers = createAsyncThunk<
  DockerContainer[],
  void,
  { state: RootState }
>(
  'docker/fetchContainers',
  async () => {
    try {
      const containers = await listContainers();
      return containers.map(createDockerContainer);
    } catch (err) {
      logger.error('Failed to fetch containers', { error: err });
      throw err;
    }
  }
);

export const startContainerThunk = createAsyncThunk<string, string>(
  'docker/startContainer',
  async (containerId) => {
    try {
      await startContainer(containerId);
      return containerId;
    } catch (err) {
      logger.error('Failed to start container', { error: err, containerId });
      throw err;
    }
  }
);

export const stopContainerThunk = createAsyncThunk<string, string>(
  'docker/stopContainer',
  async (containerId) => {
    try {
      await stopContainer(containerId);
      return containerId;
    } catch (err) {
      logger.error('Failed to stop container', { error: err, containerId });
      throw err;
    }
  }
);

export const removeContainerThunk = createAsyncThunk<string, string>(
  'docker/removeContainer',
  async (containerId) => {
    try {
      await removeContainerApi(containerId);
      return containerId;
    } catch (err) {
      logger.error('Failed to remove container', { error: err, containerId });
      throw err;
    }
  }
);

const dockerSlice: Slice<DockerState> = createSlice({
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
    updateContainer: (state, action: PayloadAction<ContainerUpdate>) => {
      const { containerId, updates } = action.payload;
      const container = state.containers.find(c => c.id === containerId);
      if (container) {
        // Ensure required properties are preserved when merging updates
        const updatedContainer: DockerContainer = {
          id: container.id,
          name: updates.name ?? container.name,
          image: updates.image ?? container.image,
          command: updates.command ?? container.command,
          created: updates.created ?? container.created,
          state: updates.state ?? container.state,
          status: updates.status ?? container.status,
          ports: updates.ports ?? container.ports,
          env: updates.env ?? container.env,
          hostId: updates.hostId ?? container.hostId
        };
        const index = state.containers.findIndex(c => c.id === containerId);
        state.containers[index] = updatedContainer;
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
        state.error = action.error.message ?? 'Failed to fetch containers';
      })
      .addCase(startContainerThunk.fulfilled, (state, action) => {
        const container = state.containers.find(c => c.id === action.payload);
        if (container) {
          container.state = 'running';
          container.status = 'running';
        }
      })
      .addCase(stopContainerThunk.fulfilled, (state, action) => {
        const container = state.containers.find(c => c.id === action.payload);
        if (container) {
          container.state = 'exited';
          container.status = 'exited';
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
export const selectAllContainers = (state: RootState): DockerContainer[] => state.docker.containers;
export const selectSelectedContainer = (state: RootState): DockerContainer | null => {
  const { selectedContainerId, containers } = state.docker;
  return selectedContainerId
    ? containers.find(c => c.id === selectedContainerId) ?? null
    : null;
};
export const selectIsLoading = (state: RootState): boolean => state.docker.loading;
export const selectError = (state: RootState): string | null => state.docker.error;
