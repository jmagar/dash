import { createSlice, type PayloadAction, Slice } from '@reduxjs/toolkit';
import type { RootState, UIState, ThemeMode } from '../storeTypes';

const initialState: UIState = {
  loading: false,
  theme: 'light',
  sidebarOpen: true,
  modalOpen: false,
  modalContent: null
};

export const uiSlice: Slice<UIState> = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showLoading(state) {
      state.loading = true;
    },
    hideLoading(state) {
      state.loading = false;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    openModal(state, action: PayloadAction<React.ReactNode>) {
      state.modalOpen = true;
      state.modalContent = action.payload;
    },
    closeModal(state) {
      state.modalOpen = false;
      state.modalContent = null;
    }
  }
});

export const {
  showLoading,
  hideLoading,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  openModal,
  closeModal
} = uiSlice.actions;

// Selectors
export const selectLoading = (state: RootState) => state.ui.loading;
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectModalOpen = (state: RootState) => state.ui.modalOpen;
export const selectModalContent = (state: RootState) => state.ui.modalContent;

export default uiSlice.reducer;
