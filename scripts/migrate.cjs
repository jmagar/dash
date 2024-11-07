import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import { Pool } from 'pg';

// Resolve __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

/**
 * Runs database migrations
 * @returns {Promise<void>}
 */
async function runMigrations(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();

    try {
      // Ensure migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Read migration files
      const migrationDir = path.join(__dirname, '../db/migrations');
      const migrationFiles = await readFile(migrationDir, { encoding: 'utf8' });

      // Sort migrations to ensure correct order
      const sortedMigrations = migrationFiles
        .split('\n')
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const migrationFile of sortedMigrations) {
        const migrationPath = path.join(migrationDir, migrationFile);

        // Check if migration has already been run
        const { rows } = await client.query(
          'SELECT * FROM migrations WHERE name = $1',
          [migrationFile],
        );

        if (rows.length === 0) {
          const migrationSQL = await readFile(migrationPath, 'utf8');

          console.log(`Running migration: ${migrationFile}`);
          await client.query(migrationSQL);

          // Record the migration
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [migrationFile],
          );

          console.log(`Migration ${migrationFile} completed successfully`);
        } else {
          console.log(`Migration ${migrationFile} already run. Skipping.`);
        }
      }

      console.log('All migrations completed successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('Unhandled migration error:', error);
  process.exit(1);
});
