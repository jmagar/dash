import { LoggingManager } from '../../server/utils/logging/LoggingManager'
import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  CreateNewFolder as CreateNewFolderIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileCopy as FileCopyIcon,
  ContentCut as ContentCutIcon,
  ContentPaste as ContentPasteIcon,
  Refresh as RefreshIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Sort as SortIcon,
  Compress as CompressIcon,
} from '@mui/icons-material';
import { fileOperations } from '../api/files.client';
import { useHost } from '../hooks/useHost';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useNotification } from '../hooks/useNotification';
import { useFileClipboard } from '../hooks/useFileClipboard';
import { useDirectoryCache } from '../hooks/useDirectoryCache';
import { useLoadingState } from '../hooks/useLoadingState';
import { frontendLogger } from '../utils/frontendLogger';
import type { FileInfo } from '../../types/files';
import type { LogMetadata } from '../../types/logging';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  mode: number;
  modTime: string;
  owner: string;
  group: string;
}

interface FileExplorerProps {
  hostId: string;
}

export function FileExplorer({ hostId }: FileExplorerProps) {
  const navigate = useNavigate();
  const { path = '/' } = useParams();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHostSelectorOpen, setIsHostSelectorOpen] = useState(!hostId);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    file: FileInfo | null;
    position: { top: number; left: number } | null;
  }>({ file: null, position: null });
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [sortField, setSortField] = useState<'name' | 'size' | 'modTime'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [compressionDialogOpen, setCompressionDialogOpen] = useState(false);
  const [compressionMode, setCompressionMode] = useState<'compress' | 'extract'>('compress');
  const [operations, setOperations] = useState<Array<{ id: string; message: string; progress: number; completed?: boolean }>>([]);

  const { host } = useHost({ hostId });
  const handleError = useErrorHandler();
  const { showNotification } = useNotification();
  const {
    clipboard,
    copyToClipboard,
    cutToClipboard,
    clearClipboard,
    canPaste,
  } = useFileClipboard();
  const {
    getCachedFiles,
    cacheFiles,
    invalidateCache,
  } = useDirectoryCache();
  const {
    startLoading,
    updateProgress,
    finishLoading,
    getAllLoadingStates,
  } = useLoadingState();

  const sortFiles = useCallback((unsortedFiles: FileInfo[]) => {
    return [...unsortedFiles].sort((a, b) => {
      // Always put directories first
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }

      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'modTime':
          comparison = new Date(a.modTime).getTime() - new Date(b.modTime).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [sortField, sortDirection]);

  const loadFiles = useCallback(async () => {
    if (!hostId) return;

    const loadingId = startLoading('Loading files...');
    setLoading(true);
    setError(null);

    try {
      frontendLogger.info('Loading files', {
        hostId,
        path,
        component: 'FileExplorer'
      });

      // Check cache first
      const cachedFiles = getCachedFiles(hostId, path);
      if (cachedFiles) {
        frontendLogger.debug('Using cached files', {
          hostId,
          path,
          fileCount: cachedFiles.length,
          component: 'FileExplorer'
        });
        setFiles(cachedFiles);
        setLoading(false);
        return;
      }

      const response = await fileOperations.listFiles(hostId, path);
      frontendLogger.info('Files loaded successfully', {
        hostId,
        path,
        fileCount: response.files.length,
        component: 'FileExplorer'
      });
      
      setFiles(response.files);
      cacheFiles(hostId, path, response.files);
      showNotification('success', 'Files loaded successfully');
    } catch (err) {
      const metadata: LogMetadata = {
        error: err instanceof Error ? err.message : 'Unknown error',
        hostId,
        path,
        component: 'FileExplorer'
      };
      handleError(err, metadata);
      setError(err.message || 'Failed to load files');
      showNotification('error', 'Failed to load files');
    } finally {
      setLoading(false);
      finishLoading(loadingId);
    }
  }, [hostId, path, getCachedFiles, cacheFiles, showNotification, startLoading, finishLoading]);

  const handleFileOperation = useCallback(async (operation: () => Promise<void>, operationName: string) => {
    const loadingId = startLoading(`${operationName}...`);
    try {
      frontendLogger.info(`Starting file operation: ${operationName}`, {
        hostId,
        path,
        component: 'FileExplorer'
      });

      await operation();
      invalidateCache(hostId, path);
      await loadFiles();
      
      frontendLogger.info(`File operation completed: ${operationName}`, {
        hostId,
        path,
        component: 'FileExplorer'
      });
      showNotification('success', `${operationName} completed successfully`);
    } catch (err) {
      const metadata: LogMetadata = {
        error: err instanceof Error ? err.message : 'Unknown error',
        hostId,
        path,
        operation: operationName,
        component: 'FileExplorer'
      };
      handleError(err, metadata);
      setError(err.message || 'Operation failed');
      showNotification('error', `${operationName} failed`);
    } finally {
      finishLoading(loadingId);
    }
  }, [hostId, path, invalidateCache, loadFiles, showNotification, startLoading, finishLoading]);

  const handleCreateFolder = useCallback((name: string) => {
    return handleFileOperation(
      async () => {
        frontendLogger.info('Creating new folder', {
          hostId,
          path,
          folderName: name,
          component: 'FileExplorer'
        });
        await fileOperations.createFolder(hostId, path, name);
      },
      'Create folder'
    );
  }, [handleFileOperation, hostId, path]);

  const handleDelete = useCallback((files: string[]) => {
    return handleFileOperation(
      async () => {
        frontendLogger.info('Deleting files', {
          hostId,
          path,
          files,
          component: 'FileExplorer'
        });
        await fileOperations.deleteFiles(hostId, files);
      },
      'Delete files'
    );
  }, [handleFileOperation, hostId]);

  const handleRename = useCallback((oldPath: string, newName: string) => {
    return handleFileOperation(
      async () => {
        frontendLogger.info('Renaming file', {
          hostId,
          oldPath,
          newName,
          component: 'FileExplorer'
        });
        await fileOperations.renameFile(hostId, oldPath, newName);
      },
      'Rename file'
    );
  }, [handleFileOperation, hostId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleHostSelect = (host: Host) => {
    frontendLogger.info('Host selected', {
      hostId: host.id,
      component: 'FileExplorer'
    });
    navigate(`/files/${host.id}`);
  };

  const handleFileClick = (file: FileInfo) => {
    frontendLogger.debug('File clicked', {
      hostId,
      path: file.path,
      isDirectory: file.isDirectory,
      component: 'FileExplorer'
    });
    
    if (file.isDirectory) {
      navigate(`/files/${hostId}${file.path}`);
    } else {
      setPreviewFile(file);
    }
  };

  const handleRefresh = () => {
    frontendLogger.info('Refreshing files', {
      hostId,
      path,
      component: 'FileExplorer'
    });
    void loadFiles();
  };

  const handleSelect = useCallback((file: FileInfo, selected: boolean) => {
    setSelectedFiles(prev => {
      if (selected) {
        return [...prev, file];
      } else {
        return prev.filter(f => f.path !== file.path);
      }
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedFiles(selected ? files : []);
  }, [files]);

  const isSelected = useCallback((file: FileInfo) => {
    return selectedFiles.some(f => f.path === file.path);
  }, [selectedFiles]);

  const handleFileSelect = (file: FileInfo, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      handleSelect(file, !isSelected(file));
    } else if (event.shiftKey && selectedFiles.length > 0) {
      const fileIndex = files.findIndex(f => f.path === file.path);
      const lastSelectedIndex = files.findIndex(f => f.path === selectedFiles[selectedFiles.length - 1].path);
      const [start, end] = [Math.min(fileIndex, lastSelectedIndex), Math.max(fileIndex, lastSelectedIndex)];
      handleSelectAll(false);
      handleSelectAll(true);
      for (let i = 0; i < files.length; i++) {
        if (i < start || i > end) {
          handleSelect(files[i], false);
        }
      }
    } else {
      handleSelectAll(false);
      handleSelect(file, true);
    }
  };

  const handleContextMenu = (file: FileInfo, event: React.MouseEvent) => {
    event.preventDefault();
    if (!selectedFiles.find(f => f.path === file.path)) {
      handleSelect(file, true);
    }
    setContextMenu({
      file,
      position: {
        top: event.clientY,
        left: event.clientX,
      },
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ file: null, position: null });
  };

  const handleNewFolder = async (name: string) => {
    try {
      setOperationError(null);
      const result = await fileOperations.createFolder(hostId, path, name);
      if (result.success) {
        setNewFolderDialogOpen(false);
        await loadFiles();
      } else {
        setOperationError(result.error || 'Failed to create folder');
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to create folder');
    }
  };

  const handleRename = async (newName: string) => {
    if (!contextMenu.file) return;
    
    try {
      setOperationError(null);
      const oldPath = contextMenu.file.path;
      const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
      
      const result = await fileOperations.renameFile(hostId, oldPath, newPath);
      if (result.success) {
        setRenameDialogOpen(false);
        await loadFiles();
      } else {
        setOperationError(result.error || 'Failed to rename file');
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to rename file');
    }
  };

  const handleDelete = async () => {
    if (selectedFiles.length === 0) return;

    const operationId = `delete-${Date.now()}`;
    const totalFiles = selectedFiles.length;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const progress = ((i + 1) / totalFiles) * 100;
        const message = `Deleting ${i + 1}/${totalFiles}: ${file.name}`;
        
        updateOperationProgress(operationId, progress, message);
        await fileOperations.deleteFile(hostId, file.path);
      }

      updateOperationProgress(operationId, 100, 'Delete completed', true);
      handleSelectAll(false);
      await loadFiles();
    } catch (error) {
      setError(error.message || 'Failed to delete files');
      updateOperationProgress(operationId, 0, 'Failed to delete files', true);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const operationId = `upload-${Date.now()}`;
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    let uploadedSize = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await fileOperations.uploadFile(hostId, path, file, (progress) => {
          uploadedSize = progress * file.size;
          const totalProgress = (uploadedSize / totalSize) * 100;
          updateOperationProgress(
            operationId,
            totalProgress,
            `Uploading ${i + 1}/${files.length}: ${file.name}`
          );
        });
      }

      updateOperationProgress(operationId, 100, 'Upload completed', true);
      await loadFiles();
    } catch (error) {
      setError(error.message || 'Failed to upload files');
      updateOperationProgress(operationId, 0, 'Failed to upload files', true);
    }
  };

  const handleCopy = () => {
    copyToClipboard(selectedFiles, hostId);
    handleCloseContextMenu();
  };

  const handleCut = () => {
    cutToClipboard(selectedFiles, hostId);
    handleCloseContextMenu();
  };

  const handlePaste = async () => {
    if (!clipboard || !canPaste) return;

    const operationId = `paste-${Date.now()}`;
    const operation = clipboard.operation === 'copy' ? 'Copying' : 'Moving';
    const totalFiles = clipboard.files.length;

    try {
      for (let i = 0; i < clipboard.files.length; i++) {
        const file = clipboard.files[i];
        const progress = ((i + 1) / totalFiles) * 100;
        const message = `${operation} ${i + 1}/${totalFiles}: ${file.name}`;
        
        updateOperationProgress(operationId, progress, message);

        if (clipboard.operation === 'copy') {
          await fileOperations.copyFile(clipboard.sourceHostId, file.path, hostId, path);
        } else {
          await fileOperations.moveFile(clipboard.sourceHostId, file.path, hostId, path);
        }
      }

      updateOperationProgress(operationId, 100, `${operation} completed`, true);
      clearClipboard();
      await loadFiles();
    } catch (error) {
      setError(error.message || `Failed to ${clipboard.operation} files`);
      updateOperationProgress(operationId, 0, `Failed to ${operation.toLowerCase()} files`, true);
    }
  };

  const handleDragStart = useCallback((event: React.DragEvent, file: FileInfo) => {
    event.dataTransfer.setData('text/plain', JSON.stringify({
      files: selectedFiles.length > 0 && selectedFiles.find(f => f.path === file.path) 
        ? selectedFiles 
        : [file],
      sourceHostId: hostId,
      sourcePath: path
    }));
  }, [selectedFiles, hostId, path]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent, targetFile: FileInfo) => {
    event.preventDefault();
    try {
      const data = JSON.parse(event.dataTransfer.getData('text/plain'));
      const { files, sourceHostId, sourcePath } = data;

      if (sourceHostId !== hostId) {
        setOperationError('Cross-host file operations are not supported');
        return;
      }

      if (!targetFile.isDirectory) {
        setOperationError('Files can only be dropped into folders');
        return;
      }

      const targetPath = targetFile.path;
      const request = {
        sourcePaths: files.map((f: FileInfo) => f.path),
        targetPath,
      };

      setOperationError(null);
      const result = await fileOperations.move(hostId, request);

      if (result.success) {
        handleSelectAll(false);
        await loadFiles();
      } else {
        setOperationError(result.error || 'Failed to move files');
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to move files');
    }
  }, [hostId, loadFiles]);

  const handleSort = useCallback((field: 'name' | 'size' | 'modTime', direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
    setFiles(files => sortFiles(files));
  }, [sortFiles]);

  const handleCompressFiles = () => {
    setCompressionMode('compress');
    setCompressionDialogOpen(true);
  };

  const handleExtractFiles = () => {
    if (selectedFiles.length !== 1) {
      return;
    }
    setCompressionMode('extract');
    setCompressionDialogOpen(true);
  };

  const updateOperationProgress = useCallback((operationId: string, progress: number, message: string, completed?: boolean) => {
    setOperations(prevOperations => {
      const existingOpIndex = prevOperations.findIndex(op => op.id === operationId);
      if (existingOpIndex >= 0) {
        const newOperations = [...prevOperations];
        newOperations[existingOpIndex] = {
          ...newOperations[existingOpIndex],
          progress,
          message,
          completed,
        };
        return newOperations;
      }
      return [...prevOperations, { id: operationId, progress, message, completed }];
    });
  }, []);

  const removeOperation = useCallback((operationId: string) => {
    setOperations(prevOperations => prevOperations.filter(op => op.id !== operationId));
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }

    if (!files?.length) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">This folder is empty</Typography>
        </Box>
      );
    }

    const sortedFiles = [...files].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    if (viewMode === 'grid') {
      return (
        <VirtualizedList
          items={sortedFiles}
          itemHeight={200}
          containerHeight={600}
          renderItem={(file, index) => (
            <FileGridItem
              key={file.path}
              file={file}
              onOpen={handleFileClick}
              onSelect={(event) => handleFileSelect(file, event)}
              selected={isSelected(file)}
              draggable
              onDragStart={(event) => handleDragStart(event, file)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, file)}
              hostId={hostId}
            />
          )}
          className="file-grid"
        />
      );
    }

    return (
      <VirtualizedList
        items={sortedFiles}
        itemHeight={48}
        containerHeight={600}
        renderItem={(file, index) => (
          <FileListItem
            key={file.path}
            file={file}
            onOpen={handleFileClick}
            onSelect={(event) => handleFileSelect(file, event)}
            selected={isSelected(file)}
            draggable
            onDragStart={(event) => handleDragStart(event, file)}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, file)}
            hostId={hostId}
          />
        )}
        className="file-list"
      />
    );
  };

  if (!hostId) {
    return (
      <div className="p-4">
        <Button
          variant="outlined"
          startIcon={<ComputerIcon />}
          onClick={() => setIsHostSelectorOpen(true)}
        >
          Select Host
        </Button>
        <HostSelector
          open={isHostSelectorOpen}
          onClose={() => setIsHostSelectorOpen(false)}
          onSelect={handleHostSelect}
        />
      </div>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <FileBreadcrumbs hostId={hostId} path={path} />
      
      <FileToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedFiles={selectedFiles}
        onNewFolder={() => setNewFolderDialogOpen(true)}
        onCopy={() => copyToClipboard(selectedFiles)}
        onCut={() => cutToClipboard(selectedFiles)}
        onPaste={handlePaste}
        canPaste={canPaste}
        onCompress={handleCompressFiles}
        onExtract={handleExtractFiles}
        canExtract={selectedFiles.length === 1 && selectedFiles[0].name.match(/\.(zip|tar|gz|bz2)$/)}
      />

      <input
        type="file"
        id="file-upload"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {renderContent()}

      <FileContextMenu
        file={contextMenu.file}
        selectedFiles={selectedFiles}
        anchorPosition={contextMenu.position}
        onClose={handleCloseContextMenu}
        onCopy={handleCopy}
        onCut={handleCut}
        onDelete={() => setDeleteDialogOpen(true)}
        onRename={() => setRenameDialogOpen(true)}
        onDownload={() => {/* TODO */}}
        onPreview={() => setPreviewFile(contextMenu.file)}
      />

      <FilePreviewModal
        open={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        hostId={hostId}
      />

      <NewFolderDialog
        open={newFolderDialogOpen}
        onClose={() => setNewFolderDialogOpen(false)}
        onConfirm={handleNewFolder}
        error={operationError}
      />

      <RenameDialog
        open={renameDialogOpen}
        file={contextMenu.file}
        onClose={() => setRenameDialogOpen(false)}
        onConfirm={handleRename}
        error={operationError}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        files={selectedFiles}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        error={operationError}
      />

      <CompressionDialog
        open={compressionDialogOpen}
        onClose={() => setCompressionDialogOpen(false)}
        hostId={hostId}
        selectedPaths={selectedFiles.map(f => f.path)}
        mode={compressionMode}
        currentPath={path}
      />

      <BulkOperationProgress
        operations={operations}
        onClose={() => setOperations([])}
      />

      <LoadingIndicator loadingStates={getAllLoadingStates()} />
    </Box>
  );
}

