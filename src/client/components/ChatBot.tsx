import React, { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Stack,
  Avatar,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useCopilotChat } from '@copilotkit/react-core';
import type { Message } from '@copilotkit/shared';
import { logger } from '../utils/frontendLogger';

interface ChatBotProps {
  onError?: (error: Error) => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ onError }) => {
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    visibleMessages: messages,
    append: sendMessage,
    isLoading,
    input,
    setInput,
    stop,
    clearMessages,
  } = useCopilotChat({
    id: 'main-chat',
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Chat error:', { error: errorMessage });
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const message: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    try {
      await sendMessage(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send message:', { error: errorMessage });
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to send message'));
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleClear = () => {
    clearMessages();
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: theme.palette.background.default,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">AI Assistant</Typography>
        <IconButton
          onClick={handleClear}
          disabled={isLoading || messages.length === 0}
          color="primary"
        >
          <DeleteIcon />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.map((message: Message) => (
          <Stack
            key={message.id}
            direction="row"
            spacing={2}
            alignItems="flex-start"
            sx={{
              bgcolor: message.role === 'assistant' 
                ? theme.palette.background.paper 
                : theme.palette.primary.main + '10',
              p: 2,
              borderRadius: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: message.role === 'assistant'
                  ? theme.palette.primary.main
                  : theme.palette.secondary.main,
              }}
            >
              {message.role === 'assistant' ? <BotIcon /> : <PersonIcon />}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message.content}
              </Typography>
            </Box>
          </Stack>
        ))}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            inputRef={inputRef}
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading}
            sx={{
              alignSelf: 'flex-end',
              bgcolor: theme.palette.primary.main,
              color: 'white',
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              },
              '&.Mui-disabled': {
                bgcolor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Paper>
    </Paper>
  );
};