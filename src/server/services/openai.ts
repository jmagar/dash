import OpenAI from 'openai';

import { config } from '../config';
import { logger } from '../utils/logger';

if (!config.openai.apiKey) {
  logger.error('OpenAI API key is not configured');
  throw new Error('OpenAI API key is required');
}

export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error('Failed to generate embedding:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function generateCompletion(prompt: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: config.openai.model || 'gpt-4',
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response generated');
    }

    return response;
  } catch (error) {
    logger.error('Failed to generate completion:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
