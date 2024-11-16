import { Send as SendIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';

import { sendMessage } from '../api/chat.client';
import { useAuth } from '../context/AuthContext';
import type { ChatMessage, ChatResponse } from '../../types/chat';
import { logger } from '../utils/frontendLogger';

interface Model {
  name: string;
  value: string;
}

const MODELS: Model[] = [
  { name: 'GPT-4', value: 'gpt-4' },
  { name: 'Claude-2', value: 'anthropic/claude-2' },
  { name: 'Mixtral', value: 'mistralai/mixtral-8x7b-instruct' },
];

export function ChatBot(): JSX.Element {
  const theme = useTheme();
  const auth = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].value);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    setInput(target.value);
  };

  const handleSend = async (): Promise<void> => {
    if (!input.trim() || !auth.user || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await sendMessage(input, {
        model: selectedModel,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date(),
        metadata: {
          model: response.data.model,
          tokens: response.data.usage.totalTokens,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      logger.error('Failed to send message:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (
    _event: React.MouseEvent<HTMLElement>,
    newModel: string | null
  ): void => {
    if (newModel !== null) {
      setSelectedModel(newModel);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '600px',
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.default,
        }}
      >
        <Typography variant="h6" gutterBottom>
          AI Assistant
        </Typography>
        <ToggleButtonGroup
          value={selectedModel}
          exclusive
          onChange={handleModelChange}
          aria-label="text alignment"
          size="small"
          sx={{ mb: 1 }}
        >
          {MODELS.map(model => (
            <ToggleButton
              key={model.value}
              value={model.value}
              aria-label={model.name}
            >
              {model.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.length === 0 && (
          <Typography variant="body1">
            {loading ? (
              <span>Loading...</span>
            ) : error ? (
              <span>{error}</span>
            ) : (
              <span>No messages yet</span>
            )}
          </Typography>
        )}
        {messages.map((msg, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Box
              sx={{
                maxWidth: '80%',
                p: 2,
                borderRadius: 2,
                bgcolor:
                  msg.role === 'user'
                    ? theme.palette.primary.main
                    : theme.palette.background.default,
                color:
                  msg.role === 'user'
                    ? theme.palette.primary.contrastText
                    : theme.palette.text.primary,
              }}
            >
              <Typography
                variant="body1"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {msg.content}
              </Typography>
              {msg.metadata && (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 1,
                    display: 'block',
                    color:
                      msg.role === 'user'
                        ? theme.palette.primary.contrastText
                        : theme.palette.text.secondary,
                    opacity: 0.8,
                  }}
                >
                  {`${msg.metadata?.model ? `Model: ${msg.metadata.model}` : ''}${
                    msg.metadata?.tokens ? ` | Tokens: ${msg.metadata.tokens}` : ''
                  }`}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.default,
          display: 'flex',
          gap: 1,
        }}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: theme.palette.background.paper,
            },
          }}
        />
        <Button
          variant="contained"
          onClick={() => void handleSend()}
          disabled={!input.trim() || loading}
          sx={{ minWidth: 'unset', px: 3 }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <SendIcon />
          )}
        </Button>
      </Box>
    </Box>
  );
}
