# Security Analysis Report

## Overview
- Total Files Scanned: {{totalFiles}}
- High Risk Issues: {{highRiskCount}}
- Medium Risk Issues: {{mediumRiskCount}}
- Low Risk Issues: {{lowRiskCount}}
- Overall Security Score: {{securityScore}}/100

## Critical Issues
{{#each criticalIssues}}
### {{file}}
- Type: {{type}}
- Severity: {{severity}}
- Line: {{line}}
- Description: {{description}}
- Impact: {{impact}}
- Recommendation: {{recommendation}}
{{/each}}

## Vulnerability Categories
{{#each vulnerabilityCategories}}
### {{category}}
- Risk Level: {{riskLevel}}
- Occurrences: {{count}}
- Files Affected: {{affectedFiles}}
- Common Patterns:
{{#each patterns}}
  - {{this}}
{{/each}}
{{/each}}

## Security Patterns
### Authentication
{{#each authPatterns}}
- {{location}}: {{description}}
{{/each}}

### Data Handling
{{#each dataPatterns}}
- {{location}}: {{description}}
{{/each}}

### Input Validation
{{#each validationPatterns}}
- {{location}}: {{description}}
{{/each}}

## Dependencies
### Vulnerable Dependencies
{{#each vulnerableDependencies}}
- {{name}} ({{version}}): {{vulnerability}}
{{/each}}

### Outdated Dependencies
{{#each outdatedDependencies}}
- {{name}}: {{currentVersion}} -> {{latestVersion}}
{{/each}}

## Configuration Issues
{{#each configIssues}}
- {{file}}: {{issue}}
{{/each}}

## Access Control
{{#each accessControl}}
### {{component}}
- Permissions: {{permissions}}
- Issues: {{issues}}
{{/each}}

## Recommendations
### High Priority
{{#each highPriorityFixes}}
1. {{this}}
{{/each}}

### Medium Priority
{{#each mediumPriorityFixes}}
1. {{this}}
{{/each}}

### Best Practices
{{#each bestPractices}}
- {{this}}
{{/each}}

## Security Metrics
- Average Time to Fix: {{timeToFix}}
- Issue Density: {{issueDensity}}
- Test Coverage: {{testCoverage}}%
- Security Debt: {{securityDebt}} hours

## Compliance Status
{{#each compliance}}
### {{standard}}
- Status: {{status}}
- Issues: {{issues}}
- Required Actions: {{actions}}
{{/each}}
