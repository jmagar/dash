#!/bin/bash

# Find all files that import from serverLogger
echo "Files importing from serverLogger:"
grep -r "from.*serverLogger" src/

# Find all files that import from store/types
echo -e "\nFiles importing from store/types:"
grep -r "from.*store/types" src/

# Show the content of these files
echo -e "\nFile contents:"
for file in $(grep -l "from.*serverLogger\|from.*store/types" src/); do
  echo -e "\n=== $file ==="
  cat "$file"
done
