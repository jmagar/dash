import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import type { HostState, ConnectionState, HostConnectionUpdate } from './types/host';
import type { LogMetadata } from '../../../types/logger';
import type { Host } from '../../../types/models-shared';
import { listHosts, connectHost, disconnectHost } from '../../api/hosts.client';
import { logger } from '../../utils/frontendLogger';
import type { RootState } from '../storeTypes';

const initialState: HostState = {
  hosts: {},
  selectedHost: null,
  connections: {},
  loading: false,
  error: null,
};

// Async thunks
export const fetchHosts = createAsyncThunk<
  Host[],
  void,
  {
    rejectValue: string;
  }
>('hosts/fetchHosts', async (_, { rejectWithValue }) => {
  try {
    const response = await listHosts();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch hosts');
    }
    return response.data;
  } catch (error) {
    const metadata: LogMetadata = {
      component: 'HostSlice',
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
    logger.error('Failed to fetch hosts:', metadata);
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch hosts');
  }
});

export const connectToHost = createAsyncThunk<
  number,
  number,
  {
    rejectValue: string;
    state: RootState;
  }
>('hosts/connect', async (hostId, { rejectWithValue }) => {
  try {
    const response = await connectHost(hostId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to connect to host');
    }
    return hostId;
  } catch (error) {
    const metadata: LogMetadata = {
      component: 'HostSlice',
      hostId,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
    logger.error('Failed to connect to host:', metadata);
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to connect to host');
  }
});

export const disconnectFromHost = createAsyncThunk<
  number,
  number,
  {
    rejectValue: string;
  }
>('hosts/disconnect', async (hostId, { rejectWithValue }) => {
  try {
    const response = await disconnectHost(hostId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to disconnect from host');
    }
    return hostId;
  } catch (error) {
    const metadata: LogMetadata = {
      component: 'HostSlice',
      hostId,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
    logger.error('Failed to disconnect from host:', metadata);
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to disconnect from host');
  }
});

const hostSlice = createSlice({
  name: 'hosts',
  initialState,
  reducers: {
    selectHost: (state, action: PayloadAction<number | null>) => {
      const hostId = action.payload;
      state.selectedHost = hostId ? state.hosts[hostId] || null : null;
    },
    updateConnectionState: (state, action: PayloadAction<HostConnectionUpdate>) => {
      const { hostId, connectionState } = action.payload;
      state.connections[hostId] = connectionState;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch hosts
      .addCase(fetchHosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHosts.fulfilled, (state, action) => {
        state.loading = false;
        state.hosts = action.payload.reduce<Record<number, Host>>((acc, host) => {
          acc[host.id] = host;
          return acc;
        }, {});
      })
      .addCase(fetchHosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch hosts';
      })
      // Connect to host
      .addCase(connectToHost.pending, (state, action) => {
        const hostId = action.meta.arg;
        state.connections[hostId] = {
          status: 'connecting',
          lastConnected: undefined,
        };
      })
      .addCase(connectToHost.fulfilled, (state, action) => {
        const hostId = action.payload;
        state.connections[hostId] = {
          status: 'connected',
          lastConnected: new Date(),
        };
      })
      .addCase(connectToHost.rejected, (state, action) => {
        const hostId = action.meta.arg;
        state.connections[hostId] = {
          status: 'error',
          lastConnected: undefined,
          error: action.payload || 'Connection failed',
        };
      })
      // Disconnect from host
      .addCase(disconnectFromHost.fulfilled, (state, action) => {
        const hostId = action.payload;
        state.connections[hostId] = {
          status: 'disconnected',
          lastConnected: undefined,
        };
        if (state.selectedHost?.id === hostId) {
          state.selectedHost = null;
        }
      });
  },
});

// Export actions and reducer
export const { selectHost, updateConnectionState, clearError } = hostSlice.actions;
export default hostSlice.reducer;

// Selectors
export const selectAllHosts = (state: RootState): Host[] =>
  Object.values(state.hosts.hosts);

export const selectSelectedHost = (state: RootState): Host | null =>
  state.hosts.selectedHost;

export const selectConnectionState = (state: RootState, hostId: number): ConnectionState | undefined =>
  state.hosts.connections[hostId];

export const selectIsLoading = (state: RootState): boolean =>
  state.hosts.loading;

export const selectError = (state: RootState): string | null =>
  state.hosts.error;
