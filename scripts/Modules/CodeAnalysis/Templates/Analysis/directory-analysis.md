# Directory Analysis: {{directoryPath}}

## Overview
- Total Files: {{totalFiles}}
- Total Size: {{totalSize}}
- Last Modified: {{lastModified}}

## File Types
{{#each fileTypes}}
- {{extension}}: {{count}} files ({{percentage}}%)
{{/each}}

## Directory Structure
```
{{directoryTree}}
```

## Key Metrics
- Average File Size: {{averageFileSize}}
- Deepest Nesting Level: {{nestingLevel}}
- Most Common File Type: {{mostCommonType}}

## Dependencies
{{#each dependencies}}
- {{name}}: {{count}} references
{{/each}}

## Recommendations
{{#each recommendations}}
- {{this}}
{{/each}}
