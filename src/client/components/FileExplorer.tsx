import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, CircularProgress, Typography } from '@mui/material';
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
import type { Host } from '../../types/models-shared';

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

export function FileExplorer() {
  const navigate = useNavigate();
  const { hostId = '', path = '/' } = useParams();
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

  useEffect(() => {
    const fetchFiles = async () => {
      if (!hostId) {
        setFiles([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/hosts/${hostId}/files?path=${encodeURIComponent(path)}`);
        const data = await response.json();

        if (data.success && data.data) {
          const fileList = data.data.map((file: any) => ({
            ...file,
            isDirectory: file.isDir,
          }));
          setFiles(sortFiles(fileList));
        } else {
          setError(data.error || 'Failed to fetch files');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch files');
      } finally {
        setLoading(false);
      }
    };

    void fetchFiles();
  }, [hostId, path, sortFiles]);

  const handleHostSelect = (host: Host) => {
    navigate(`/files/${host.id}`);
  };

  const handleFileClick = (file: FileInfo) => {
    if (file.isDirectory) {
      navigate(`/files/${hostId}${file.path}`);
    }
  };

  const handleRefresh = () => {
    void fetchFiles();
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
      const result = await fileOperations.createFolder(hostId, { path, name });
      if (result.success) {
        setNewFolderDialogOpen(false);
        void fetchFiles();
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
      
      const result = await fileOperations.rename(hostId, { oldPath, newPath });
      if (result.success) {
        setRenameDialogOpen(false);
        void fetchFiles();
      } else {
        setOperationError(result.error || 'Failed to rename file');
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to rename file');
    }
  };

  const handleDelete = async () => {
    try {
      setOperationError(null);
      const paths = selectedFiles.map(file => file.path);
      const result = await fileOperations.delete(hostId, { paths });
      if (result.success) {
        setDeleteDialogOpen(false);
        handleSelectAll(false);
        void fetchFiles();
      } else {
        setOperationError(result.error || 'Failed to delete files');
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to delete files');
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      void fileOperations.upload(hostId, path, files).then(result => {
        if (result.success) {
          void fetchFiles();
        } else {
          setOperationError(result.error || 'Failed to upload files');
        }
      });
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
    if (!clipboard.files.length || !clipboard.operation || !clipboard.sourceHostId) return;

    try {
      setOperationError(null);
      const request = {
        sourcePaths: clipboard.files.map(f => f.path),
        targetPath: path,
      };

      const result = clipboard.operation === 'copy'
        ? await fileOperations.copy(clipboard.sourceHostId, request)
        : await fileOperations.move(clipboard.sourceHostId, request);

      if (result.success) {
        clearClipboard();
        void fetchFiles();
      } else {
        setOperationError(result.error || `Failed to ${clipboard.operation} files`);
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : `Failed to ${clipboard.operation} files`);
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
        void fetchFiles();
      } else {
        setOperationError(result.error || 'Failed to move files');
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to move files');
    }
  }, [hostId, fetchFiles]);

  const handleSort = useCallback((field: 'name' | 'size' | 'modTime', direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
    setFiles(files => sortFiles(files));
  }, [sortFiles]);

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

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <CircularProgress />
        </div>
      ) : error ? (
        <div className="p-4 text-red-500 bg-red-50 rounded-md">
          {error}
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <FolderOpen sx={{ fontSize: 48, marginBottom: 2 }} />
          <Typography variant="h6">This folder is empty</Typography>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : ''}>
          {files.map((file) => (
            viewMode === 'grid' ? (
              <FileGridItem
                key={file.path}
                file={file}
                selected={isSelected(file)}
                onClick={() => handleFileClick(file)}
                onSelect={(event) => handleFileSelect(file, event)}
                onContextMenu={(event) => handleContextMenu(file, event)}
                onDragStart={(event) => handleDragStart(event, file)}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, file)}
              />
            ) : (
              <FileListItem
                key={file.path}
                file={file}
                selected={isSelected(file)}
                onClick={() => handleFileClick(file)}
                onSelect={(event) => handleFileSelect(file, event)}
                onContextMenu={(event) => handleContextMenu(file, event)}
                onDragStart={(event) => handleDragStart(event, file)}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, file)}
              />
            )
          ))}
        </div>
      )}

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
    </div>
  );
}
