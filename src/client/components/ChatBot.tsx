import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  useTheme,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import { sendMessage } from '../api/chat.client';
import { logger } from '../utils/logger';
import type { ChatMessage, ChatSettings } from '../../types/chat';

const AI_MODELS = [
  { name: 'GPT-3.5 Turbo', value: 'openai/gpt-3.5-turbo' },
  { name: 'GPT-4', value: 'openai/gpt-4' },
  { name: 'Claude 2', value: 'anthropic/claude-2' },
] as const;

interface ChatBotProps {
  onClose?: () => void;
}

export function ChatBot({ onClose }: ChatBotProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<typeof AI_MODELS[number]['value']>(AI_MODELS[0].value);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    try {
      setLoading(true);
      setError(null);
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      const settings: Partial<ChatSettings> = {
        model: selectedModel,
        maxTokens: 1000,
        temperature: 0.7,
      };

      const response = await sendMessage(input, settings);

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.data?.message || '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.data?.usage) {
        logger.info('Chat message sent successfully', {
          model: response.data.model,
          tokens: response.data.usage.totalTokens,
        });
      }
    } catch (err) {
      logger.error('Failed to send message:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const getLastMessageByRole = (role: ChatMessage['role']) => {
    return messages.findLast((m: ChatMessage) => m.role === role);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const retryLastMessage = () => {
    const lastUserMessage = getLastMessageByRole('user');
    if (lastUserMessage) {
      setInput(lastUserMessage.content);
    }
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Noto Sans, sans-serif',
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
        <Typography variant="h6" sx={{ fontFamily: 'Noto Sans, sans-serif' }}>
          AI Assistant
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="AI Model Settings">
            <IconButton
              onClick={() => setShowSettings(!showSettings)}
              color="primary"
              size="small"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Retry last message">
            <IconButton 
              onClick={retryLastMessage} 
              color="primary" 
              size="small"
              disabled={!messages.some(m => m.role === 'user')}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear chat">
            <IconButton 
              onClick={clearChat} 
              color="error" 
              size="small"
              disabled={messages.length === 0}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {showSettings && (
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>AI Model</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {AI_MODELS.map((model) => (
              <Chip
                key={model.value}
                label={model.name}
                onClick={() => setSelectedModel(model.value)}
                color={selectedModel === model.value ? 'primary' : 'default'}
                variant={selectedModel === model.value ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 2 }}>
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
            onChange={(e) => setInput(e.target.value)}
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
            onClick={() => void handleSend()}
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
