import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Divider,
  ButtonGroup,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Upload as UploadIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Sort as SortIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Label as LabelIcon,
  Schedule as ScheduleIcon,
  Memory as MemoryIcon,
  ContentPaste as ContentPasteIcon,
} from '@mui/icons-material';

interface FileToolbarProps {
  onRefresh: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onSort: (field: 'name' | 'size' | 'modTime', direction: 'asc' | 'desc') => void;
  sortField: 'name' | 'size' | 'modTime';
  sortDirection: 'asc' | 'desc';
  disabled?: boolean;
  canPaste?: boolean;
  onPaste?: () => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (selected: boolean) => void;
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
  disabled,
  canPaste,
  onPaste,
  selectedCount,
  totalCount,
  onSelectAll,
}: FileToolbarProps) {
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

  const handleSortClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSortMenuAnchor(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortMenuAnchor(null);
  };

  const handleSortSelect = (field: 'name' | 'size' | 'modTime') => {
    const newDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
    handleSortClose();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: 1,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Checkbox
        indeterminate={selectedCount > 0 && selectedCount < totalCount}
        checked={selectedCount === totalCount}
        onChange={(e) => onSelectAll(e.target.checked)}
        disabled={disabled || totalCount === 0}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
        {selectedCount > 0 ? `${selectedCount} selected` : `${totalCount} items`}
      </Typography>
      <Tooltip title="Refresh">
        <span>
          <IconButton onClick={onRefresh} disabled={disabled}>
            <RefreshIcon />
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

      <Tooltip title="Upload Files">
        <span>
          <IconButton onClick={onUpload} disabled={disabled}>
            <UploadIcon />
          </IconButton>
        </span>
      </Tooltip>

      {canPaste && (
        <Tooltip title="Paste">
          <span>
            <IconButton onClick={onPaste} disabled={disabled}>
              <ContentPasteIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <ButtonGroup size="small" disabled={disabled}>
        <Tooltip title="List View">
          <IconButton
            color={viewMode === 'list' ? 'primary' : 'default'}
            onClick={() => onViewModeChange('list')}
          >
            <ViewListIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Grid View">
          <IconButton
            color={viewMode === 'grid' ? 'primary' : 'default'}
            onClick={() => onViewModeChange('grid')}
          >
            <ViewModuleIcon />
          </IconButton>
        </Tooltip>
      </ButtonGroup>

      <Tooltip title="Sort">
        <span>
          <IconButton onClick={handleSortClick} disabled={disabled}>
            <SortIcon />
          </IconButton>
        </span>
      </Tooltip>

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
        <MenuItem onClick={() => handleSortSelect('modTime')}>
          <ListItemIcon>
            {sortField === 'modTime' && (
              sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />
            )}
          </ListItemIcon>
          <ListItemText>Modified</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
