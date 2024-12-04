import OpenAI from 'openai';
import config from '../config';
import { LoggingManager } from '../managers/utils/LoggingManager';

if (!config.openai.apiKey) {
  LoggingManager.getInstance().error('OpenAI API key is not configured');
  throw new Error('OpenAI API key is required');
}

export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  organization: config.openai.org,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    LoggingManager.getInstance().error('Failed to generate embedding:', {
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
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response generated');
    }

    return response;
  } catch (error) {
    LoggingManager.getInstance().error('Failed to generate completion:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}


