# Code Analysis Report

## Overview
- Total Files Analyzed: {{totalFiles}}
- Average Security Score: {{averageSecurityScore}}
- Total Patterns Found: {{totalPatterns}}

## Language Distribution
{{#each languages}}
- {{@key}}: {{this}}
{{/each}}

## Pattern Categories
{{#each patterns.byCategory}}
- {{@key}}: {{this}}
{{/each}}

## Security
- High Risk Files: {{security.highRiskFiles.length}}
{{#each security.highRiskFiles}}
- {{this}}
{{/each}}

## Recommendations
{{#each recommendations}}
### {{file}}
- Type: {{type}}
- Severity: {{severity}}
- Suggestions:
{{#each suggestions}}
  - {{this}}
{{/each}}

{{/each}}
