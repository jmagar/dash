import React, { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { FileInfo } from './FileExplorer';
import { BookmarkDialog } from './BookmarkDialog';
import { useBookmarks } from '../hooks/useBookmarks';
import { logger } from '../utils/frontendLogger';

interface BookmarkButtonProps {
  file: FileInfo;
  hostId: string;
}

export function BookmarkButton({ file, hostId }: BookmarkButtonProps) {
  const {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    updateBookmarkNotes,
    isBookmarked,
    getBookmark
  } = useBookmarks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const existingBookmark = getBookmark(hostId, file.path);
  const isCurrentlyBookmarked = isBookmarked(hostId, file.path);

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isProcessing) return;

    if (isCurrentlyBookmarked) {
      try {
        setIsProcessing(true);
        await removeBookmark(hostId, file.path);
      } catch (error) {
        logger.error('Failed to remove bookmark:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          hostId,
          path: file.path,
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      setDialogOpen(true);
    }
  };

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDialogOpen(true);
  };

  const handleDialogConfirm = async (notes: string) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      if (existingBookmark) {
        await updateBookmarkNotes(hostId, file.path, notes);
      } else {
        await addBookmark(hostId, file.path, file.name, file.isDirectory, notes);
      }
      setDialogOpen(false);
    } catch (error) {
      logger.error('Failed to update bookmark:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        path: file.path,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <IconButton size="small" disabled>
        <CircularProgress size={20} />
      </IconButton>
    );
  }

  return (
    <>
      <Tooltip title={isCurrentlyBookmarked ? 'Remove bookmark' : 'Add bookmark'}>
        <IconButton
          onClick={handleClick}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (isCurrentlyBookmarked) {
              handleEditClick(e);
            }
          }}
          size="small"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <CircularProgress size={20} />
          ) : isCurrentlyBookmarked ? (
            <StarIcon color="primary" />
          ) : (
            <StarBorderIcon />
          )}
        </IconButton>
      </Tooltip>

      <BookmarkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDialogConfirm}
        file={file}
        existingNotes={existingBookmark?.notes}
      />
    </>
  );
}
