import type { FileInfo } from '../../../types/files';

export type ViewMode = 'list' | 'grid';
export type SortField = keyof FileInfo;
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export interface ViewState {
  mode: ViewMode;
  sortState: SortState;
}

export interface FileOperationError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface FileSelectionState {
  selectedFiles: FileInfo[];
  lastSelected: FileInfo | null;
}

export interface FileOperationState {
  loading: boolean;
  error: FileOperationError | null;
}

export interface FileContextMenuState {
  anchorEl: HTMLElement | null;
  file: FileInfo | null;
}

export interface FileClipboardState {
  files: FileInfo[];
  operation: 'cut' | 'copy' | null;
}

export interface FilePreviewProps {
  file: FileInfo | null;
  hostId: string;
  open: boolean;
  onClose: () => void;
}

export interface BookmarkData {
  id: string;
  hostId: string;
  path: string;
  name: string;
  isDirectory: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
} 