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

import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/frontendLogger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Model {
  name: string;
  value: string;
}

interface ChatResponse {
  response: string;
}

const MODELS: Model[] = [
  { name: 'GPT-4', value: 'gpt-4' },
  { name: 'Claude-2', value: 'anthropic/claude-2' },
  { name: 'Mixtral', value: 'mistralai/mixtral-8x7b-instruct' },
];

export function ChatBot(): JSX.Element {
  const theme = useTheme();
  const auth = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
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

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          userId: auth.user.id,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json() as ChatResponse;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      logger.error('Failed to get chat response:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      setError('Failed to get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!auth.user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Please log in to use the chat.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: '800px',
        mx: 'auto',
        bgcolor: theme.palette.background.default,
        borderRadius: 2,
        boxShadow: theme.shadows[3],
      }}
    >
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <ToggleButtonGroup
          value={selectedModel}
          exclusive
          onChange={(_, value): void => value && setSelectedModel(value)}
          size="small"
          sx={{ width: '100%', justifyContent: 'center' }}
        >
          {MODELS.map((model) => (
            <ToggleButton
              key={model.value}
              value={model.value}
              sx={{
                fontFamily: 'Noto Sans, sans-serif',
                textTransform: 'none',
              }}
            >
              {model.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={(): void => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{
        flexGrow: 1,
        overflowY: 'auto',
        p: 2,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: theme.palette.background.default,
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme.palette.primary.light,
          borderRadius: '4px',
        },
      }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              mb: 1,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                maxWidth: '70%',
                backgroundColor: message.role === 'user'
                  ? theme.palette.primary.main
                  : theme.palette.background.paper,
                color: message.role === 'user'
                  ? theme.palette.primary.contrastText
                  : theme.palette.text.primary,
                borderRadius: '12px',
                fontFamily: 'Noto Sans, sans-serif',
                boxShadow: theme.shadows[1],
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Noto Sans, sans-serif',
                }}
              >
                {message.content}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.7,
                  display: 'block',
                  mt: 0.5,
                  fontFamily: 'Noto Sans, sans-serif',
                }}
              >
                {message.timestamp.toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
              backgroundColor: theme.palette.background.paper,
              '& .MuiInputBase-root': {
                fontFamily: 'Noto Sans, sans-serif',
              },
            }}
            error={!!error}
          />
          <Button
            variant="contained"
            onClick={(): void => void handleSend()}
            disabled={!input.trim() || loading}
            endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{
              fontFamily: 'Noto Sans, sans-serif',
              minWidth: '100px',
            }}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
