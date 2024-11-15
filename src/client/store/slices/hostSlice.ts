import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import type { Host } from '../../../types/api';
import { RootState } from '../index';

interface HostState {
  hosts: Record<string, Host>;
  loading: boolean;
  error: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const initialState: HostState = {
  hosts: {},
  loading: false,
  error: null,
};

export const fetchHosts = createAsyncThunk<Host[], void, { rejectValue: string }>(
  'hosts/fetchHosts',
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
  'hosts/addHost',
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
  'hosts/removeHost',
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
  name: 'hosts',
  initialState,
  reducers: {
    updateHostStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const { id, status } = action.payload;
      if (state.hosts[id]) {
        state.hosts[id].status = status;
      }
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
      })
      .addCase(removeHost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to remove host';
      });
  },
});

export const { updateHostStatus } = hostSlice.actions;

export const selectHosts = (state: RootState): Host[] =>
  Object.values(state.hosts.hosts);

export const selectHostById = (state: RootState, id: string): Host | undefined =>
  state.hosts.hosts[id];

export const selectHostsLoading = (state: RootState): boolean =>
  state.hosts.loading;

export const selectHostsError = (state: RootState): string | null =>
  state.hosts.error;

export default hostSlice.reducer;
