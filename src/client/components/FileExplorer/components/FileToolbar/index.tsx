import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography
} from '@mui/material';
import {
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Sort as SortIcon,
  Refresh as RefreshIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Upload as UploadIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Compress as CompressIcon,
  FolderZip as ExtractIcon
} from '@mui/icons-material';
import type { FileInfo } from '../../../../../types/files';

interface FileToolbarProps {
  onRefresh: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onSort: (field: keyof FileInfo) => void;
  sortField: keyof FileInfo;
  sortDirection: 'asc' | 'desc';
  disabled?: boolean;
  selectedCount?: number;
  totalCount?: number;
  onCompress?: () => void;
  onExtract?: () => void;
  canExtract?: boolean;
}

export function FileToolbar({
  onRefresh,
  onNewFolder,
  onUpload,
  viewMode,
  onViewModeChange,
  onSort,
  sortField,
  sortDirection,
  disabled = false,
  selectedCount = 0,
  totalCount = 0,
  onCompress,
  onExtract,
  canExtract = false,
}: FileToolbarProps): JSX.Element {
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

  const handleSortClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSortMenuAnchor(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortMenuAnchor(null);
  };

  const handleSortSelect = (field: keyof FileInfo) => {
    onSort(field);
    handleSortClose();
  };

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'list' | 'grid' | null) => {
    if (newMode) {
      onViewModeChange(newMode);
    }
  };

  return (
    <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title="Refresh">
        <span>
          <IconButton onClick={onRefresh} disabled={disabled}>
            <RefreshIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Sort">
        <span>
          <IconButton onClick={handleSortClick} disabled={disabled}>
            <SortIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem />

      <Tooltip title="New Folder">
        <span>
          <IconButton onClick={onNewFolder} disabled={disabled}>
            <CreateNewFolderIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Upload">
        <span>
          <IconButton onClick={onUpload} disabled={disabled}>
            <UploadIcon />
          </IconButton>
        </span>
      </Tooltip>

      {onCompress && (
        <Tooltip title="Compress">
          <span>
            <IconButton onClick={onCompress} disabled={disabled || selectedCount === 0}>
              <CompressIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}

      {onExtract && (
        <Tooltip title="Extract">
          <span>
            <IconButton onClick={onExtract} disabled={disabled || !canExtract}>
              <ExtractIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <Typography variant="body2" color="text.secondary">
        {selectedCount > 0 ? `${selectedCount} selected` : `${totalCount} items`}
      </Typography>

      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={handleViewModeChange}
        disabled={disabled}
        size="small"
      >
        <ToggleButton value="list">
          <Tooltip title="List View">
            <ViewListIcon />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="grid">
          <Tooltip title="Grid View">
            <ViewModuleIcon />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={handleSortClose}
      >
        <MenuItem onClick={() => handleSortSelect('name')}>
          <ListItemIcon>
            {sortField === 'name' && (
              sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />
            )}
          </ListItemIcon>
          <ListItemText>Name</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSortSelect('size')}>
          <ListItemIcon>
            {sortField === 'size' && (
              sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />
            )}
          </ListItemIcon>
          <ListItemText>Size</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSortSelect('modified')}>
          <ListItemIcon>
            {sortField === 'modified' && (
              sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />
            )}
          </ListItemIcon>
          <ListItemText>Modified</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
} 