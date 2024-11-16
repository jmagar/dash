import { useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { ChatMessage, ChatResponse } from '../../types/chat';

interface UseChatOptions {
  onError?: (error: string) => void;
}

export function useChat({ onError }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const socket = useSocket();

  const sendMessage = useCallback(async (content: string) => {
    try {
      setLoading(true);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      const data = await response.json() as ChatResponse;

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to send message');
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.data.content,
        timestamp: new Date(),
        code: data.data.code,
        language: data.data.language,
        command: data.data.command,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Notify connected clients about new message
      if (socket) {
        socket.emit('chat:message', assistantMessage);
      }

      return assistantMessage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      onError?.(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [socket, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    clearMessages,
  };
}
