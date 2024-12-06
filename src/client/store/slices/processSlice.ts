import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ProcessInfo, ProcessStats } from '../../../types/process';
import type { RootState } from '../../store/storeTypes';
import { logger } from '../../utils/frontendLogger';
import { processApi } from '../../api/process';

interface ProcessState {
  processes: ProcessInfo[];
  stats: ProcessStats | null;
  selectedProcessId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProcessState = {
  processes: [],
  stats: null,
  selectedProcessId: null,
  loading: false,
  error: null,
};

export const fetchProcesses = createAsyncThunk<
  ProcessInfo[],
  string,
  { state: RootState }
>('process/fetchProcesses', async (hostId) => {
  try {
    const response = await processApi.listProcesses(hostId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch processes');
    }
    return response.data || [];
  } catch (err) {
    logger.error('Failed to fetch processes', { error: err });
    throw err;
  }
});

const processSlice = createSlice({
  name: 'process',
  initialState,
  reducers: {
    updateProcesses: (state, action: PayloadAction<ProcessInfo[]>) => {
      state.processes = action.payload;
    },
    updateProcess: (state, action: PayloadAction<ProcessInfo>) => {
      const index = state.processes.findIndex(p => p.pid === action.payload.pid);
      if (index !== -1) {
        state.processes[index] = action.payload;
      } else {
        state.processes.push(action.payload);
      }
    },
    removeProcess: (state, action: PayloadAction<number>) => {
      state.processes = state.processes.filter(p => p.pid !== action.payload);
    },
    updateStats: (state, action: PayloadAction<ProcessStats>) => {
      state.stats = action.payload;
    },
    selectProcess: (state, action: PayloadAction<string | null>) => {
      state.selectedProcessId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProcesses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProcesses.fulfilled, (state, action) => {
        state.loading = false;
        state.processes = action.payload;
      })
      .addCase(fetchProcesses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch processes';
      });
  },
});

export const {
  updateProcesses,
  updateProcess,
  removeProcess,
  updateStats,
  selectProcess,
} = processSlice.actions;

export default processSlice.reducer;

// Selectors
export const selectAllProcesses = (state: RootState) => state.process.processes;
export const selectProcessStats = (state: RootState) => state.process.stats;
export const selectSelectedProcess = (state: RootState) => {
  const { selectedProcessId, processes } = state.process;
  return selectedProcessId
    ? processes.find(p => p.pid.toString() === selectedProcessId) ?? null
    : null;
};
export const selectIsLoading = (state: RootState) => state.process.loading;
export const selectError = (state: RootState) => state.process.error;
