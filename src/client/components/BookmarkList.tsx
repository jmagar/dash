import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Paper,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { Bookmark } from '@prisma/client';
import { useBookmarks } from '../hooks/useBookmarks';

interface BookmarkListProps {
  hostId: string;
  onBookmarkClick: (bookmark: Bookmark) => void;
  onEditBookmark: (bookmark: Bookmark) => void;
}

export function BookmarkList({
  hostId,
  onBookmarkClick,
  onEditBookmark,
}: BookmarkListProps) {
  const { bookmarks, loading, error, removeBookmark } = useBookmarks();

  if (loading) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">
          Failed to load bookmarks. Please try refreshing the page.
        </Typography>
      </Paper>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No bookmarks yet. Add some by clicking the star icon next to files or folders.
        </Typography>
      </Paper>
    );
  }

  // Filter bookmarks for current host
  const hostBookmarks = bookmarks.filter(b => b.hostId === hostId);

  const handleDelete = async (bookmark: Bookmark) => {
    try {
      await removeBookmark(bookmark.hostId, bookmark.path);
    } catch (error) {
      // Error is already logged by the hook
      // We could show a snackbar here if desired
    }
  };

  return (
    <List>
      {hostBookmarks.map((bookmark) => (
        <ListItem
          key={`${bookmark.hostId}:${bookmark.path}`}
          button
          onClick={() => onBookmarkClick(bookmark)}
          sx={{
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          {bookmark.isDirectory ? (
            <FolderIcon color="primary" sx={{ mr: 2 }} />
          ) : (
            <InsertDriveFileIcon color="action" sx={{ mr: 2 }} />
          )}
          <ListItemText
            primary={bookmark.name}
            secondary={
              <>
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {bookmark.path}
                </Typography>
                {bookmark.notes && (
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontStyle: 'italic',
                    }}
                  >
                    {bookmark.notes}
                  </Typography>
                )}
              </>
            }
          />
          <ListItemSecondaryAction>
            <Tooltip title="Edit bookmark">
              <IconButton
                edge="end"
                aria-label="edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBookmark(bookmark);
                }}
                sx={{ mr: 1 }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete bookmark">
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(bookmark);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
}
