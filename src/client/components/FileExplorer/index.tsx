import React, { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { HostSelector } from '../HostSelector';
import { useHost } from '../../hooks/useHost';
import { useErrorHandler } from '../../hooks/useErrorHandler';
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
  const { handleError } = useErrorHandler();
  const [path] = useState(initialPath);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [bulkOperations] = useState<{ id: string; message: string; progress: number; completed?: boolean }[]>([]);

  const { host } = useHost(initialHostId);

  const { viewState, setViewMode, setSortState } = useFileView();
  const { state: selectionState, actions: selectionActions } = useFileSelection({ files });
  const { operations } = useFileOperations(host?.id || '', path);
  const { contextMenu, handleContextMenu, handleCloseContextMenu } = useFileContextMenu();
  const { dialogs, openDialog, closeDialog } = useFileDialogs();
  const { copyToClipboard, cutToClipboard, canPaste } = useFileClipboard();
  const { downloadMultiple } = useFileDownload();

  const handleRefresh = useCallback(async () => {
    if (!host?.id) return;
    setLoading(true);
    try {
      const result = await fileOperations.listFiles(host.id, path);
      if (result.success && result.data) {
        setFiles(result.data.files);
      }
    } catch (err) {
      handleError(err);
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

  const handleDownload = useCallback(() => {
    void downloadMultiple(selectionState.selectedFiles);
  }, [downloadMultiple, selectionState.selectedFiles]);

  const handleRename = useCallback((file: FileInfo, newName: string) => {
    void operations.rename(file, newName);
  }, [operations]);

  const handleDelete = useCallback(() => {
    void operations.delete(selectionState.selectedFiles);
  }, [operations, selectionState.selectedFiles]);

  const handlePaste = useCallback(() => {
    // Implement paste operation
    console.log('Paste operation not implemented');
  }, []);

  const handleCompressFiles = useCallback(async (paths: string[], format: string): Promise<void> => {
    // Implement compression operation
    console.log('Compress operation not implemented', paths, format);
    return Promise.resolve();
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <HostSelector
        open={!host && !initialHostId}
        onClose={() => navigate('/')}
        onSelect={handleHostSelect}
      />

      <FileBreadcrumbs hostId={host?.id || ''} path={path} />

      <FileToolbar
        onRefresh={() => void handleRefresh()}
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
        selectedFiles={selectionState.selectedFiles}
        viewMode={viewState.mode}
        onSelect={selectionActions.selectFile}
        onContextMenu={handleContextMenu}
        onMoreClick={handleContextMenu}
      />

      <FileContextMenu
        file={contextMenu.file}
        selectedFiles={selectionState.selectedFiles}
        anchorPosition={contextMenu.anchorEl ? {
          top: contextMenu.anchorEl.getBoundingClientRect().top,
          left: contextMenu.anchorEl.getBoundingClientRect().left
        } : null}
        canPaste={canPaste}
        onClose={handleCloseContextMenu}
        onCopy={() => copyToClipboard(selectionState.selectedFiles)}
        onCut={() => cutToClipboard(selectionState.selectedFiles)}
        onPaste={handlePaste}
        onDelete={() => void handleDelete()}
        onRename={() => openDialog('rename')}
        onDownload={() => void handleDownload()}
        onPreview={() => openDialog('preview')}
        onCompress={handleCompress}
        hostId={host?.id || ''}
      />

      <FileOperationDialogs
        dialogs={dialogs}
        onClose={closeDialog}
        selectedFiles={selectionState.selectedFiles}
        selectedFile={contextMenu.file}
        onCreateFolder={(name) => void operations.createFolder(name)}
        onRename={(newName) => {
          if (contextMenu.file) {
            void handleRename(contextMenu.file, newName);
          }
        }}
        onDelete={handleDelete}
      />

      <CompressionDialog
        open={dialogs.compress}
        onClose={() => closeDialog('compress')}
        selectedFiles={selectionState.selectedFiles}
        onCompress={handleCompressFiles}
      />

      <BulkOperationProgress
        open={bulkOperations.length > 0}
        operations={bulkOperations}
      />

      <FileUploadDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUpload={async (files) => operations.upload(files)}
        currentPath={path}
      />
    </Box>
  );
}