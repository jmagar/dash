import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Register ts-node/esm loader
register('ts-node/esm', pathToFileURL(`${__dirname}/`));
