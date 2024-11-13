import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

const files = glob.sync('src/**/*.{ts,tsx}');

files.forEach(file => {
  let content = readFileSync(file, 'utf8');

  // Replace serverLogger imports with logger
  content = content.replace(
    /import\s*{\s*serverLogger(?:\s+as\s+logger)?\s*}\s*from\s*['"](.*)\/serverLogger['"]/g,
    "import { logger } from '$1/logger'"
  );

  // Replace store/types imports with store/storeTypes
  content = content.replace(
    /from\s*['"](.*?)\/store\/types['"]/g,
    'from \'$1/store/storeTypes\''
  );

  writeFileSync(file, content, 'utf8');
});
