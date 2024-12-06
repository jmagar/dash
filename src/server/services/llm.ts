import OpenAI from 'openai';

import type { LogMetadata } from '../../types/logger';
import config from '../config';
import { LoggingManager } from '../managers/LoggingManager';

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

type ErrorMetadata = LogMetadata & {
  error: string;
  provider?: string;
  model?: string;
  [key: string]: unknown;
};

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

    if (!response.data[0]?.embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    return response.data[0].embedding;
  } catch (error) {
    const metadata: ErrorMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: 'OpenAI',
      model: 'text-embedding-ada-002',
    };
    LoggingManager.getInstance().error('Failed to generate embedding', metadata);
    throw error;
  }
}

export async function generateCompletion(prompt: string): Promise<string> {
  try {
    if (config.openrouter.apiKey) {
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

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from OpenRouter');
      }
      return content;

    } else if (config.openai.apiKey) {
      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from OpenAI');
      }
      return content;

    } else {
      throw new Error('No API key configured for OpenAI or OpenRouter');
    }

  } catch (error) {
    const metadata: ErrorMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: config.openrouter.apiKey ? 'OpenRouter' : 'OpenAI',
      model: config.openrouter.apiKey ? config.openrouter.model : config.openai.model,
    };
    LoggingManager.getInstance().error('Failed to generate completion', metadata);
    throw error;
  }
}
