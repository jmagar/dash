import OpenAI from 'openai';

import type { LogMetadata } from '../../types/logger';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  organization: config.openai.org,
});

interface OpenRouterMessage {
  role: string;
  content: string;
}

interface OpenRouterChoice {
  message: OpenRouterMessage;
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}

interface ErrorMetadata extends LogMetadata {
  error: string;
  provider?: string;
  model?: string;
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    const metadata: ErrorMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: 'OpenAI',
      model: 'text-embedding-ada-002',
    };
    logger.error('Failed to generate embedding', metadata);
    throw error;
  }
}

export async function generateCompletion(prompt: string, useOpenRouter = false): Promise<string> {
  try {
    if (useOpenRouter && config.openrouter.apiKey) {
      const body: OpenRouterRequestBody = {
        model: config.openrouter.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.openrouter.maxTokens,
        temperature: config.openrouter.temperature,
      };

      const response = await fetch(config.openrouter.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openrouter.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data: OpenRouterResponse = await response.json();
      return data.choices[0]?.message?.content || '';

    } else if (config.openai.apiKey) {
      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      });

      return response.choices[0]?.message?.content || '';

    } else {
      throw new Error('No API key configured for OpenAI or OpenRouter');
    }

  } catch (error) {
    const metadata: ErrorMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: useOpenRouter ? 'OpenRouter' : 'OpenAI',
      model: useOpenRouter ? config.openrouter.model : config.openai.model,
    };
    logger.error('Failed to generate completion', metadata);
    throw error;
  }
}

// Helper function to determine which service to use
function shouldUseOpenRouter(): boolean {
  return !!(config.openrouter.apiKey && !config.openai.apiKey);
}
