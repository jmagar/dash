import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ContentCopy,
  ContentCut,
  Delete,
  DriveFileRenameOutline,
  Download,
  Preview,
  OpenInNew,
} from '@mui/icons-material';
import type { FileInfo } from './FileExplorer';
import OpenWithMenu from './OpenWithMenu'; // Assuming OpenWithMenu is in the same directory

interface FileContextMenuProps {
  file: FileInfo | null;
  selectedFiles: FileInfo[];
  anchorPosition: { top: number; left: number } | null;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDownload: () => void;
  onPreview: () => void;
  hostId: string; // Assuming hostId is a string
}

export function FileContextMenu({
  file,
  selectedFiles,
  anchorPosition,
  onClose,
  onCopy,
  onCut,
  onDelete,
  onRename,
  onDownload,
  onPreview,
  hostId,
}: FileContextMenuProps) {
  const [openWithAnchor, setOpenWithAnchor] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorPosition);
  const multipleSelected = selectedFiles.length > 1;

  const handleOpenWithClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setOpenWithAnchor(event.currentTarget);
  };

  const handleOpenWithClose = () => {
    setOpenWithAnchor(null);
    onClose();
  };

  return (
    <>
      <Menu
        open={open}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition || undefined}
        sx={{ '& .MuiPaper-root': { minWidth: 200 } }}
      >
        {!multipleSelected && file && !file.isDirectory && (
          <>
            <MenuItem onClick={onPreview}>
              <ListItemIcon>
                <Preview fontSize="small" />
              </ListItemIcon>
              <ListItemText>Preview</ListItemText>
            </MenuItem>

            <MenuItem onClick={handleOpenWithClick}>
              <ListItemIcon>
                <OpenInNew fontSize="small" />
              </ListItemIcon>
              <ListItemText>Open With</ListItemText>
            </MenuItem>
          </>
        )}

        <MenuItem onClick={onCopy}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Copy {multipleSelected ? `(${selectedFiles.length} items)` : ''}
          </ListItemText>
        </MenuItem>

        <MenuItem onClick={onCut}>
          <ListItemIcon>
            <ContentCut fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Cut {multipleSelected ? `(${selectedFiles.length} items)` : ''}
          </ListItemText>
        </MenuItem>

        {!multipleSelected && (
          <MenuItem onClick={onRename}>
            <ListItemIcon>
              <DriveFileRenameOutline fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
        )}

        <Divider />

        {!file?.isDirectory && (
          <MenuItem onClick={onDownload}>
            <ListItemIcon>
              <Download fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              Download {multipleSelected ? `(${selectedFiles.length} items)` : ''}
            </ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Delete {multipleSelected ? `(${selectedFiles.length} items)` : ''}
          </ListItemText>
        </MenuItem>
      </Menu>

      {file && (
        <OpenWithMenu
          file={file}
          anchorEl={openWithAnchor}
          onClose={handleOpenWithClose}
          hostId={hostId}
        />
      )}
    </>
  );
}
