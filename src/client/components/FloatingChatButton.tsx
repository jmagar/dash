import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  IconButton,
  Box,
  useTheme,
  Tooltip,
  Zoom,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import { ChatBot } from './ChatBot';

export function FloatingChatButton() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: theme.spacing(3),
          right: theme.spacing(3),
          zIndex: theme.zIndex.speedDial,
        }}
      >
        <Zoom in={!open}>
          <Tooltip title="Chat with AI Assistant" placement="left">
            <Fab
              color="primary"
              onClick={handleOpen}
              sx={{
                width: 56,
                height: 56,
                boxShadow: theme.shadows[8],
                '&:hover': {
                  boxShadow: theme.shadows[12],
                },
              }}
            >
              <ChatIcon />
            </Fab>
          </Tooltip>
        </Zoom>
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            position: 'fixed',
            bottom: theme.spacing(3),
            right: theme.spacing(3),
            m: 0,
            width: '400px',
            maxHeight: '600px',
            borderRadius: '12px',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.shadows[2],
              '&:hover': {
                backgroundColor: theme.palette.background.paper,
                opacity: 0.9,
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <ChatBot />
      </Dialog>
    </>
  );
}
