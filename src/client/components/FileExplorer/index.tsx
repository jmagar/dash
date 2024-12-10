import React, { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { HostSelector } from '../HostSelector';
import { useHost } from '../../hooks/useHost';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useNotification } from '../../hooks/useNotification';
import { FileList } from './components/FileList';
import { FileToolbar } from './components/FileToolbar';
import { FileContextMenu } from './components/FileContextMenu';
import { FileOperationDialogs } from './components/FileOperationDialogs';
import { CompressionDialog } from './components/CompressionDialog';
import { BulkOperationProgress } from './components/BulkOperationProgress';
import { FileUploadDialog } from './components/FileUploadDialog';
import { FileBreadcrumbs } from './components/FileBreadcrumbs';
import { useFileView } from './hooks/useFileView';
import { useFileSelection } from './hooks/useFileSelection';
import { useFileOperations } from './hooks/useFileOperations';
import { useFileContextMenu } from './hooks/useFileContextMenu';
import { useFileDialogs } from './hooks/useFileDialogs';
import { useFileClipboard } from './hooks/useFileClipboard';
import { useFileDownload } from './hooks/useFileDownload';
import { fileOperations } from '../../api/files.client';
import type { FileInfo } from '../../../types/files';
import type { Host } from '../../../types/host';
import type { SortField } from './types';

interface FileExplorerProps {
  hostId?: string;
  path?: string;
}

export function FileExplorer({ hostId: initialHostId, path: initialPath = '/' }: FileExplorerProps) {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { handleError } = useErrorHandler();
  const [path, setPath] = useState(initialPath);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const { host } = useHost(initialHostId);

  const { viewState, setViewMode, setSortState } = useFileView();
  const { state: selectionState, actions: selectionActions } = useFileSelection({ files });
  const { state: operationState, operations } = useFileOperations(host?.id || '', path);
  const { contextMenu, handleContextMenu, handleCloseContextMenu } = useFileContextMenu();
  const { dialogs, openDialog, closeDialog } = useFileDialogs();
  const { clipboardState, copyToClipboard, cutToClipboard, clearClipboard, canPaste } = useFileClipboard();
  const { downloadMultiple } = useFileDownload();

  const handleRefresh = useCallback(async () => {
    if (!host?.id) return;
    setLoading(true);
    try {
      const result = await fileOperations.list(host.id, path);
      if (result.success && result.data) {
        setFiles(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load files');
      }
    } catch (err) {
      handleError(err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [host?.id, path, handleError]);

  const handleNewFolder = useCallback(() => {
    openDialog('createFolder');
  }, [openDialog]);

  const handleUpload = useCallback(() => {
    setShowUploadDialog(true);
  }, []);

  const handleCompress = useCallback(() => {
    openDialog('compress');
  }, [openDialog]);

  const handleExtract = useCallback(() => {
    openDialog('extract');
  }, [openDialog]);

  const handleHostSelect = useCallback((selectedHost: Host) => {
    navigate(`/files/${selectedHost.id}`);
  }, [navigate]);

  const handleSort = useCallback((field: SortField) => {
    const currentDirection = viewState.sortState.direction;
    const newDirection = field === viewState.sortState.field && currentDirection === 'asc' ? 'desc' : 'asc';
    setSortState(field, newDirection);
  }, [viewState.sortState.field, viewState.sortState.direction, setSortState]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <HostSelector
        open={!host && !initialHostId}
        onClose={() => navigate('/')}
        onSelect={handleHostSelect}
      />

      <FileBreadcrumbs hostId={host?.id || ''} path={path} />

      <FileToolbar
        onRefresh={handleRefresh}
        onNewFolder={handleNewFolder}
        onUpload={handleUpload}
        viewMode={viewState.mode}
        onViewModeChange={setViewMode}
        onSort={handleSort}
        sortField={viewState.sortState.field}
        sortDirection={viewState.sortState.direction}
        disabled={!host || loading}
        selectedCount={selectionState.selectedFiles.length}
        totalCount={files.length}
        onCompress={handleCompress}
        onExtract={handleExtract}
        canExtract={selectionState.selectedFiles.length === 1 && /\.(zip|tar|gz|bz2)$/.test(selectionState.selectedFiles[0]?.name || '')}
      />

      <FileList
        files={files}
        loading={loading}
        error={error}
        viewMode={viewState.mode}
        sortState={viewState.sortState}
        selectedFiles={selectionState.selectedFiles}
        onSelect={selectionActions.selectFile}
        onSelectRange={selectionActions.selectRange}
        onContextMenu={handleContextMenu}
      />

      <FileContextMenu
        open={contextMenu.open}
        anchorPosition={contextMenu.position}
        onClose={handleCloseContextMenu}
        selectedFiles={selectionState.selectedFiles}
        canPaste={canPaste}
        onCopy={copyToClipboard}
        onCut={cutToClipboard}
        onPaste={operations.paste}
        onDelete={() => openDialog('delete')}
        onRename={() => openDialog('rename')}
        onShare={() => openDialog('share')}
        onDownload={downloadMultiple}
      />

      <FileOperationDialogs
        dialogs={dialogs}
        onClose={closeDialog}
        selectedFiles={selectionState.selectedFiles}
        operations={operations}
      />

      <CompressionDialog
        open={dialogs.compress}
        onClose={() => closeDialog('compress')}
        selectedFiles={selectionState.selectedFiles}
        onCompress={operations.compress}
      />

      <BulkOperationProgress
        operations={operationState.operations}
        onCancel={operations.cancelOperation}
      />

      <FileUploadDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        hostId={host?.id || ''}
        path={path}
        onUploadComplete={handleRefresh}
      />
    </Box>
  );
}