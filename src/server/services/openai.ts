import OpenAI from 'openai';
import config from '../config';
import { LoggingManager } from '../managers/LoggingManager';

if (!config.openai.apiKey) {
  LoggingManager.getInstance().error('OpenAI API key is not configured');
  throw new Error('OpenAI API key is required');
}

export const openaiClient: OpenAI = new OpenAI({
  apiKey: config.openai.apiKey,
  organization: config.openai.org,
});

export default openaiClient;

export { openaiClient as openai };

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    const embeddings = response.data;
    if (!embeddings || embeddings.length === 0) {
      throw new Error('No embeddings returned');
    }

    const embedding = embeddings[0]?.embedding;
    if (!embedding) {
      throw new Error('Invalid embedding format returned');
    }

    return embedding;
  } catch (error) {
    LoggingManager.getInstance().error('Failed to generate embedding:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function generateCompletion(prompt: string): Promise<string> {
  try {
    const completion = await openaiClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: config.openai.model || 'gpt-4',
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    });

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('No response generated');
    }

    return completion.choices[0].message.content;
  } catch (error) {
    LoggingManager.getInstance().error('Failed to generate completion:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
