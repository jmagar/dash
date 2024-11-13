#!/bin/bash

# Update serverLogger imports to logger
find src/server -type f -name "*.ts" -exec sed -i 's/import { serverLogger as logger } from.*\/serverLogger/import { logger } from "..\/utils\/logger"/g' {} +

# Update relative paths based on directory depth
find src/server/routes/hosts -type f -name "*.ts" -exec sed -i 's/import { logger } from "..\/utils\/logger"/import { logger } from "..\/..\/..\/utils\/logger"/g' {} +
find src/server/routes -type f -name "*.ts" -exec sed -i 's/import { logger } from "..\/utils\/logger"/import { logger } from "..\/..\/utils\/logger"/g' {} +
find src/server/middleware -type f -name "*.ts" -exec sed -i 's/import { logger } from "..\/utils\/logger"/import { logger } from "..\/..\/utils\/logger"/g' {} +
find src/server/api -type f -name "*.ts" -exec sed -i 's/import { logger } from "..\/utils\/logger"/import { logger } from "..\/..\/utils\/logger"/g' {} +

# Update store/types imports to storeTypes
find src -type f -name "*.ts" -exec sed -i 's/from.*\/store\/types/from "..\/store\/storeTypes"/g' {} +

echo "Import statements updated successfully"
