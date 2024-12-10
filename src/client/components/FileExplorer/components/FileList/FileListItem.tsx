import React from 'react';
import { ListItem, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import type { FileInfo } from '../../../../../types/files';

interface FileListItemProps {
  file: FileInfo;
  onSelect: (event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onMoreClick: (event: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  selected?: boolean;
}

export function FileListItem({
  file,
  onSelect,
  onContextMenu,
  onMoreClick,
  onDoubleClick,
  selected
}: FileListItemProps): JSX.Element {
  return (
    <ListItem
      button
      selected={selected}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      <ListItemIcon>
        {file.type === 'directory' ? <FolderIcon /> : <FileIcon />}
      </ListItemIcon>
      <ListItemText
        primary={file.name}
        secondary={`${file.size || ''} ${file.modified || ''}`}
      />
      <IconButton onClick={onMoreClick} size="small">
        <MoreVertIcon />
      </IconButton>
    </ListItem>
  );
} 