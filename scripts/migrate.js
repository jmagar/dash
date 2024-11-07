const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'shh',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const migrations = fs.readdirSync(path.join(__dirname, 'migrations'))
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const migration of migrations) {
      console.log(`Running migration: ${migration}`);
      const sql = fs.readFileSync(path.join(__dirname, 'migrations', migration), 'utf8');
      await client.query(sql);
    }

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
