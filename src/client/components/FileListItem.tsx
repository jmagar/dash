import React from 'react';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
  Box,
  useTheme,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { formatBytes, formatDate } from '../utils/format';

interface FileListItemProps {
  name: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

export function FileListItem({
  name,
  isDirectory,
  size,
  modified,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  onDownload,
  onShare,
}: FileListItemProps): JSX.Element {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (callback?: () => void) => {
    handleClose();
    callback?.();
  };

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <IconButton
          edge="end"
          aria-label="more"
          onClick={handleClick}
          size="small"
          sx={{
            opacity: open ? 1 : 0,
            transition: 'opacity 0.2s',
            '.MuiListItem-root:hover &': {
              opacity: 1,
            },
          }}
        >
          <MoreVertIcon />
        </IconButton>
      }
    >
      <ListItemButton
        selected={selected}
        onClick={onSelect}
        sx={{
          borderRadius: 1,
          '&.Mui-selected': {
            backgroundColor: theme.palette.action.selected,
          },
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <ListItemIcon>
          {isDirectory ? (
            <FolderIcon color="primary" />
          ) : (
            <FileIcon color="action" />
          )}
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography variant="body1" noWrap>
              {name}
            </Typography>
          }
          secondary={
            <Box
              component="span"
              sx={{
                display: 'flex',
                gap: 2,
                color: 'text.secondary',
                fontSize: '0.75rem',
              }}
            >
              {size !== undefined && (
                <span>{formatBytes(size)}</span>
              )}
              {modified && (
                <span>{formatDate(modified)}</span>
              )}
            </Box>
          }
        />
      </ListItemButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {onEdit && (
          <MenuItem onClick={() => handleAction(onEdit)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {onCopy && (
          <MenuItem onClick={() => handleAction(onCopy)}>
            <ListItemIcon>
              <CopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Copy</ListItemText>
          </MenuItem>
        )}
        {!isDirectory && onDownload && (
          <MenuItem onClick={() => handleAction(onDownload)}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download</ListItemText>
          </MenuItem>
        )}
        {onShare && (
          <MenuItem onClick={() => handleAction(onShare)}>
            <ListItemIcon>
              <ShareIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share</ListItemText>
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem
            onClick={() => handleAction(onDelete)}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </ListItem>
  );
}
