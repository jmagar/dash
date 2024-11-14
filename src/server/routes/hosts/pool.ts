import { Client } from 'pg';
import { logger } from '../../utils/logger';

export const CONNECTION_TIMEOUT = 5000; // 5 seconds
export const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds
export const KEEP_ALIVE_COUNT_MAX = 3;

export async function getConnection(config: any): Promise<Client> {
  const client = new Client(config);
  await client.connect();
  return client;
}

export async function closeConnection(client: Client): Promise<void> {
  try {
    await client.end();
  } catch (error) {
    logger.error('Error closing connection:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export default {
  getConnection,
  closeConnection,
};
