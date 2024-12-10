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
  ContentPaste,
  Delete,
  DriveFileRenameOutline,
  Download,
  Preview,
  OpenInNew,
  Compress,
} from '@mui/icons-material';
import type { FileInfo } from '../../../../../types/files';
import { OpenWithMenu } from '../../components/OpenWithMenu';

interface FileContextMenuProps {
  file: FileInfo | null;
  selectedFiles: FileInfo[];
  anchorPosition: { top: number; left: number } | null;
  canPaste: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDownload: () => void;
  onPreview: () => void;
  onCompress: () => void;
  hostId: string;
}

export function FileContextMenu({
  file,
  selectedFiles,
  anchorPosition,
  canPaste,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  onDownload,
  onPreview,
  onCompress,
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

  if (!file) return null;

  const isDirectory = file.type === 'directory';

  return (
    <>
      <Menu
        open={open}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition || undefined}
        sx={{ '& .MuiPaper-root': { minWidth: 200 } }}
      >
        {!multipleSelected && !isDirectory && (
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

        {canPaste && (
          <MenuItem onClick={onPaste}>
            <ListItemIcon>
              <ContentPaste fontSize="small" />
            </ListItemIcon>
            <ListItemText>Paste</ListItemText>
          </MenuItem>
        )}

        {!multipleSelected && (
          <MenuItem onClick={onRename}>
            <ListItemIcon>
              <DriveFileRenameOutline fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
        )}

        <Divider />

        {!isDirectory && (
          <>
            <MenuItem onClick={onDownload}>
              <ListItemIcon>
                <Download fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                Download {multipleSelected ? `(${selectedFiles.length} items)` : ''}
              </ListItemText>
            </MenuItem>

            <MenuItem onClick={onCompress}>
              <ListItemIcon>
                <Compress fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                Compress {multipleSelected ? `(${selectedFiles.length} items)` : ''}
              </ListItemText>
            </MenuItem>
          </>
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

      {!isDirectory && (
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