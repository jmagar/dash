import React from 'react';
import type { FileInfo } from '@types/files';
import { NewFolderDialog } from './NewFolderDialog';
import { RenameDialog } from './RenameDialog';
import { DeleteDialog } from './DeleteDialog';

interface FileOperationDialogsProps {
  dialogs: {
    createFolder: boolean;
    rename: boolean;
    delete: boolean;
  };
  selectedFiles: FileInfo[];
  selectedFile: FileInfo | null;
  onClose: (dialog: 'createFolder' | 'rename' | 'delete') => void;
  onCreateFolder: (name: string) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  error?: {
    createFolder?: string;
    rename?: string;
    delete?: string;
  };
}

export function FileOperationDialogs({
  dialogs,
  selectedFiles,
  selectedFile,
  onClose,
  onCreateFolder,
  onRename,
  onDelete,
  error,
}: FileOperationDialogsProps) {
  return (
    <>
      <NewFolderDialog
        open={dialogs.createFolder}
        onClose={() => onClose('createFolder')}
        onConfirm={onCreateFolder}
        error={error?.createFolder}
      />

      <RenameDialog
        open={dialogs.rename}
        file={selectedFile}
        onClose={() => onClose('rename')}
        onConfirm={onRename}
        error={error?.rename}
      />

      <DeleteDialog
        open={dialogs.delete}
        files={selectedFiles}
        onClose={() => onClose('delete')}
        onConfirm={onDelete}
        error={error?.delete}
      />
    </>
  );
} 