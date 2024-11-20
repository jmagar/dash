import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, CircularProgress, Typography, Box } from '@mui/material';
import { Computer as ComputerIcon } from '@mui/icons-material';
import { FolderOpen } from '@mui/icons-material';
import { useHost } from '../hooks/useHost';
import { FileListItem } from './FileListItem';
import { FileGridItem } from './FileGridItem';
import { HostSelector } from './HostSelector';
import { FileBreadcrumbs } from './FileBreadcrumbs';
import { FileToolbar } from './FileToolbar';
import { FileContextMenu } from './FileContextMenu';
import { FilePreview } from './FilePreview';
import { NewFolderDialog, RenameDialog, DeleteDialog } from './FileOperationDialogs';
import { fileOperations } from '../api/files.client';
import { useFileClipboard } from '../hooks/useFileClipboard';
import { useDirectoryCache } from '../hooks/useDirectoryCache';
import type { Host } from '../../types/models-shared';
import { VirtualizedList } from './VirtualizedList';
import { useLoadingState } from '../hooks/useLoadingState';
import { LoadingIndicator } from './LoadingIndicator';

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
  const { host } = useHost({ hostId });
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

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedFiles = getCachedFiles(hostId, path);
      if (cachedFiles) {
        setFiles(cachedFiles);
        setLoading(false);
        return;
      }

      const response = await fileOperations.listFiles(hostId, path);
      setFiles(response.files);
      
      // Cache the results
      cacheFiles(hostId, path, response.files);
    } catch (err) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [hostId, path, getCachedFiles, cacheFiles]);

  const handleFileOperation = useCallback(async (operation: () => Promise<void>) => {
    try {
      await operation();
      invalidateCache(hostId, path);
      await loadFiles();
    } catch (err) {
      setError(err.message || 'Operation failed');
    }
  }, [hostId, path, invalidateCache, loadFiles]);

  const handleCreateFolder = useCallback((name: string) => {
    return handleFileOperation(async () => {
      await fileOperations.createFolder(hostId, path, name);
    });
  }, [handleFileOperation, hostId, path]);

  const handleDelete = useCallback((files: string[]) => {
    return handleFileOperation(async () => {
      await fileOperations.deleteFiles(hostId, files);
    });
  }, [handleFileOperation, hostId]);

  const handleRename = useCallback((oldPath: string, newName: string) => {
    return handleFileOperation(async () => {
      await fileOperations.renameFile(hostId, oldPath, newName);
    });
  }, [handleFileOperation, hostId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleHostSelect = (host: Host) => {
    navigate(`/files/${host.id}`);
  };

  const handleFileClick = (file: FileInfo) => {
    if (file.isDirectory) {
      navigate(`/files/${hostId}${file.path}`);
    }
  };

  const handleRefresh = () => {
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
    startLoading(
      operationId,
      `Deleting ${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'}...`
    );

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await fileOperations.deleteFile(hostId, file.path);
        updateProgress(
          operationId,
          ((i + 1) / selectedFiles.length) * 100,
          `Deleting ${i + 1}/${selectedFiles.length}: ${file.name}`
        );
      }

      handleSelectAll(false);
      await loadFiles();
    } catch (error) {
      setError(error.message || 'Failed to delete files');
    } finally {
      finishLoading(operationId);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const operationId = `upload-${Date.now()}`;
    startLoading(operationId, `Uploading ${files.length} files...`);

    try {
      const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
      let uploadedSize = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await fileOperations.uploadFile(hostId, path, file, (progress) => {
          uploadedSize = progress * file.size;
          const totalProgress = (uploadedSize / totalSize) * 100;
          updateProgress(
            operationId,
            totalProgress,
            `Uploading ${i + 1}/${files.length}: ${file.name}`
          );
        });
      }

      await loadFiles();
    } catch (error) {
      setError(error.message || 'Failed to upload files');
    } finally {
      finishLoading(operationId);
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
    startLoading(
      operationId,
      `${operation} ${clipboard.files.length} ${clipboard.files.length === 1 ? 'file' : 'files'}...`
    );

    try {
      for (let i = 0; i < clipboard.files.length; i++) {
        const file = clipboard.files[i];
        if (clipboard.operation === 'copy') {
          await fileOperations.copyFile(clipboard.sourceHostId, file.path, hostId, path);
        } else {
          await fileOperations.moveFile(clipboard.sourceHostId, file.path, hostId, path);
        }
        updateProgress(
          operationId,
          ((i + 1) / clipboard.files.length) * 100,
          `${operation} ${i + 1}/${clipboard.files.length}: ${file.name}`
        );
      }

      clearClipboard();
      await loadFiles();
    } catch (error) {
      setError(error.message || `Failed to ${clipboard.operation} files`);
    } finally {
      finishLoading(operationId);
    }
  };

  const handlePreview = () => {
    if (contextMenu.file && !contextMenu.file.isDirectory) {
      setPreviewFile(contextMenu.file);
    }
    handleCloseContextMenu();
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
    <div className="h-full flex flex-col">
      <FileBreadcrumbs hostId={hostId} path={path} />
      
      <FileToolbar
        onRefresh={handleRefresh}
        onNewFolder={() => setNewFolderDialogOpen(true)}
        onUpload={() => document.getElementById('file-upload')?.click()}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSort={handleSort}
        sortField={sortField}
        sortDirection={sortDirection}
        disabled={loading}
        selectedCount={selectedFiles.length}
        totalCount={files.length}
        onSelectAll={handleSelectAll}
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
        onPreview={handlePreview}
      />

      <FilePreview
        open={Boolean(previewFile)}
        file={previewFile}
        hostId={hostId}
        onClose={() => setPreviewFile(null)}
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

      <LoadingIndicator loadingStates={getAllLoadingStates()} />
    </div>
  );
}
