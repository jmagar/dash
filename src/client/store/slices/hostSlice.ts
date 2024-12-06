import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Host } from '../../../types/api';
import type { RootState, ConnectionState, ConnectionStatus } from '../storeTypes';

interface HostState {
  hosts: Record<string, Host>;
  selectedHostId: string | null;
  loading: boolean;
  error: string | null;
  connections: Record<string, ConnectionState>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const initialState: HostState = {
  hosts: {},
  selectedHostId: null,
  loading: false,
  error: null,
  connections: {},
};

export const fetchHosts = createAsyncThunk<Host[], void, { rejectValue: string }>(
  'host/fetchHosts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/hosts');
      const result = (await response.json()) as ApiResponse<Host[]>;

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to fetch hosts');
      }

      return result.data || [];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch hosts');
    }
  }
);

export const addHost = createAsyncThunk<Host, Host, { rejectValue: string }>(
  'host/addHost',
  async (host, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/hosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(host),
      });

      const result = (await response.json()) as ApiResponse<Host>;

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to add host');
      }

      return result.data as Host;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add host');
    }
  }
);

export const removeHost = createAsyncThunk<string, string, { rejectValue: string }>(
  'host/removeHost',
  async (hostId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/hosts/${hostId}`, {
        method: 'DELETE',
      });

      const result = (await response.json()) as ApiResponse<void>;

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to remove host');
      }

      return hostId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to remove host');
    }
  }
);

const hostSlice = createSlice({
  name: 'host',
  initialState,
  reducers: {
    updateHostStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const { id, status } = action.payload;
      if (state.hosts[id]) {
        state.hosts[id].status = status;
      }
    },
    updateConnection: (state, action: PayloadAction<{ hostId: string; status: ConnectionStatus; error?: string }>) => {
      const { hostId, status, error } = action.payload;
      state.connections[hostId] = {
        status,
        lastConnected: status === 'connected' ? new Date() : undefined,
        error,
      };
    },
    selectHost: (state, action: PayloadAction<string | null>) => {
      state.selectedHostId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHosts.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.hosts = action.payload.reduce<Record<string, Host>>((acc, host) => {
          acc[host.id] = host;
          // Initialize connection state for new hosts
          if (!state.connections[host.id]) {
            state.connections[host.id] = {
              status: 'disconnected',
            };
          }
          return acc;
        }, {});
      })
      .addCase(fetchHosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch hosts';
      })
      .addCase(addHost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addHost.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.hosts[action.payload.id] = action.payload;
        // Initialize connection state for new host
        state.connections[action.payload.id] = {
          status: 'disconnected',
        };
      })
      .addCase(addHost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to add host';
      })
      .addCase(removeHost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeHost.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        delete state.hosts[action.payload];
        delete state.connections[action.payload];
        if (state.selectedHostId === action.payload) {
          state.selectedHostId = null;
        }
      })
      .addCase(removeHost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to remove host';
      });
  },
});

export const { updateHostStatus, updateConnection, selectHost } = hostSlice.actions;

export const selectHosts = (state: RootState): Host[] =>
  Object.values(state.host.hosts);

export const selectHostById = (state: RootState, id: string): Host | undefined =>
  state.host.hosts[id];

export const selectSelectedHost = (state: RootState): Host | null => {
  const { selectedHostId, hosts } = state.host;
  return selectedHostId ? (hosts[selectedHostId] ?? null) : null;
};

export const selectHostConnection = (state: RootState, hostId: string): ConnectionState | undefined =>
  state.host.connections[hostId];

export const selectHostsLoading = (state: RootState): boolean =>
  state.host.loading;

export const selectHostsError = (state: RootState): string | null =>
  state.host.error;

export default hostSlice.reducer;
