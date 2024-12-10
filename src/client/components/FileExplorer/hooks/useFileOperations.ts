import { useState, useCallback } from 'react';
import { fileOperations } from '../../../api/files.client';
import type { FileInfo } from '../../../../types/files';
import type { FileOperationState } from '../types';

interface FileOperations {
  createFolder: (name: string) => Promise<void>;
  rename: (file: FileInfo, newName: string) => Promise<void>;
  delete: (files: FileInfo[]) => Promise<void>;
  move: (files: FileInfo[], targetPath: string) => Promise<void>;
  copy: (files: FileInfo[], targetPath: string) => Promise<void>;
  upload: (files: FileList) => Promise<void>;
  openFile: (path: string, app: string) => Promise<void>;
}

export function useFileOperations(hostId: string, currentPath: string) {
  const [state, setState] = useState<FileOperationState>({
    loading: false,
    error: null,
  });

  const createFolder = useCallback(async (name: string) => {
    try {
      setState({ loading: true, error: null });
      await fileOperations.createFolder(hostId, {
        path: currentPath,
        name,
      });
    } catch (error) {
      setState({
        loading: false,
        error: {
          message: 'Failed to create folder',
          code: 'CREATE_FOLDER_ERROR',
          details: { error },
        },
      });
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [hostId, currentPath]);

  const rename = useCallback(async (file: FileInfo, newName: string) => {
    try {
      setState({ loading: true, error: null });
      await fileOperations.rename(hostId, {
        oldPath: file.path,
        newPath: `${currentPath}/${newName}`,
      });
    } catch (error) {
      setState({
        loading: false,
        error: {
          message: 'Failed to rename file/folder',
          code: 'RENAME_ERROR',
          details: { error },
        },
      });
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [hostId, currentPath]);

  const deleteFiles = useCallback(async (files: FileInfo[]) => {
    try {
      setState({ loading: true, error: null });
      await fileOperations.deleteFiles(hostId, {
        paths: files.map(f => f.path),
      });
    } catch (error) {
      setState({
        loading: false,
        error: {
          message: 'Failed to delete files/folders',
          code: 'DELETE_ERROR',
          details: { error },
        },
      });
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [hostId]);

  const move = useCallback(async (files: FileInfo[], targetPath: string) => {
    try {
      setState({ loading: true, error: null });
      await fileOperations.move(hostId, {
        sourcePaths: files.map(f => f.path),
        targetPath,
      });
    } catch (error) {
      setState({
        loading: false,
        error: {
          message: 'Failed to move files/folders',
          code: 'MOVE_ERROR',
          details: { error },
        },
      });
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [hostId]);

  const copy = useCallback(async (files: FileInfo[], targetPath: string) => {
    try {
      setState({ loading: true, error: null });
      await fileOperations.copy(hostId, {
        sourcePaths: files.map(f => f.path),
        targetPath,
      });
    } catch (error) {
      setState({
        loading: false,
        error: {
          message: 'Failed to copy files/folders',
          code: 'COPY_ERROR',
          details: { error },
        },
      });
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [hostId]);

  const upload = useCallback(async (files: FileList) => {
    try {
      setState({ loading: true, error: null });
      await fileOperations.upload(hostId, currentPath, files);
    } catch (error) {
      setState({
        loading: false,
        error: {
          message: 'Failed to upload files',
          code: 'UPLOAD_ERROR',
          details: { error },
        },
      });
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [hostId, currentPath]);

  const openFile = useCallback(async (path: string, app: string) => {
    try {
      setState({ loading: true, error: null });
      await fileOperations.openFile(hostId, path, app);
    } catch (error) {
      setState({
        loading: false,
        error: {
          message: 'Failed to open file',
          code: 'OPEN_ERROR',
          details: { error },
        },
      });
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [hostId]);

  const operations: FileOperations = {
    createFolder,
    rename,
    delete: deleteFiles,
    move,
    copy,
    upload,
    openFile,
  };

  return {
    state,
    operations,
  };
} 