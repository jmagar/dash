import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { BookmarkBorder, Bookmark } from '@mui/icons-material';
import { useBookmarks } from '../../../../hooks/useBookmarks';
import { BookmarkDialog } from './BookmarkDialog';
import type { FileInfo } from '../../../../../types/files';

interface BookmarkButtonProps {
  file: FileInfo;
  hostId: string;
}

export function BookmarkButton({ file, hostId }: BookmarkButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { bookmarks, addBookmark, removeBookmark, updateBookmarkNotes } = useBookmarks();

  const existingBookmark = bookmarks.find(
    (b) => b.hostId === hostId && b.path === file.path
  );

  const handleClick = () => {
    if (existingBookmark) {
      void removeBookmark(hostId, file.path);
    } else {
      setDialogOpen(true);
    }
  };

  const handleDialogConfirm = (notes: string) => {
    if (existingBookmark) {
      void updateBookmarkNotes(hostId, file.path, notes).then(() => {
        setDialogOpen(false);
      });
    } else {
      void addBookmark(
        hostId,
        file.path,
        file.name,
        file.type === 'directory',
        notes
      ).then(() => {
        setDialogOpen(false);
      });
    }
  };

  return (
    <>
      <Tooltip title={existingBookmark ? 'Remove Bookmark' : 'Add Bookmark'}>
        <IconButton onClick={handleClick} size="small">
          {existingBookmark ? (
            <Bookmark fontSize="small" color="primary" />
          ) : (
            <BookmarkBorder fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      <BookmarkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDialogConfirm}
        file={file}
        existingNotes={existingBookmark?.notes || undefined}
      />
    </>
  );
} 