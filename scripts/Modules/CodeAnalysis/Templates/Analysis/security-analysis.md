# Security Analysis Report

## Overview
- Analysis Date: {{analysisDate}}
- Total Files Scanned: {{totalFiles}}
- High Risk Issues: {{highRiskCount}}
- Medium Risk Issues: {{mediumRiskCount}}
- Low Risk Issues: {{lowRiskCount}}
- Overall Security Score: {{securityScore}}/100
- Analysis Tool Version: {{toolVersion}}

## Critical Issues
{{#each criticalIssues}}
### {{file}}
- Type: {{type}}
- Severity: {{severity}}
- Line: {{line}}
- Description: {{description}}
- CVSS Score: {{cvssScore}}
- Impact: {{impact}}
- Recommendation: {{recommendation}}
- Pattern Matched: {{pattern}}
{{/each}}

## Vulnerability Categories
{{#each vulnerabilityCategories}}
### {{category}}
- Risk Level: {{riskLevel}}
- Occurrences: {{count}}
- Files Affected: {{affectedFiles}}
- Detection Confidence: {{confidence}}
- Patterns:
{{#each patterns}}
  - {{pattern}}: {{matches}} occurrences
    - Confidence: {{confidence}}
    - False Positive Rate: {{falsePositiveRate}}
{{/each}}
{{/each}}

## Security Patterns
### Authentication & Authorization
{{#each authPatterns}}
- Location: {{location}}
- Pattern: {{pattern}}
- Description: {{description}}
- Risk Level: {{riskLevel}}
- Validation Status: {{validationStatus}}
{{/each}}

### Data Protection
{{#each dataProtectionPatterns}}
- Location: {{location}}
- Pattern: {{pattern}}
- Description: {{description}}
- Encryption Status: {{encryptionStatus}}
- Data Classification: {{classification}}
{{/each}}

### Input Validation
{{#each validationPatterns}}
- Location: {{location}}
- Pattern: {{pattern}}
- Description: {{description}}
- Validation Type: {{validationType}}
- Coverage: {{coverage}}%
{{/each}}

## Dependencies
### Vulnerable Dependencies
{{#each vulnerableDependencies}}
- {{name}} ({{version}})
  - Vulnerability: {{vulnerability}}
  - CVSS Score: {{cvssScore}}
  - Fix Version: {{fixVersion}}
  - Advisory: {{advisory}}
{{/each}}

### Outdated Dependencies
{{#each outdatedDependencies}}
- {{name}}
  - Current: {{currentVersion}}
  - Latest: {{latestVersion}}
  - Breaking Changes: {{breakingChanges}}
  - Security Fixes: {{securityFixes}}
{{/each}}

## Configuration Analysis
{{#each configIssues}}
### {{file}}
- Issue: {{issue}}
- Risk Level: {{riskLevel}}
- Current Value: {{currentValue}}
- Recommended Value: {{recommendedValue}}
- Compliance Status: {{complianceStatus}}
{{/each}}

## Access Control Matrix
{{#each accessControl}}
### {{component}}
- Required Permissions: {{permissions}}
- Current Implementation: {{implementation}}
- Issues Found: {{issues}}
- Recommendations: {{recommendations}}
{{/each}}

## Recommendations
### Critical (Must Fix)
{{#each criticalFixes}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Priority: {{priority}}
{{/each}}

### High Priority
{{#each highPriorityFixes}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Priority: {{priority}}
{{/each}}

### Medium Priority
{{#each mediumPriorityFixes}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Priority: {{priority}}
{{/each}}

## Security Metrics
- Average Time to Fix: {{metrics.timeToFix}}
- Issue Density: {{metrics.issueDensity}} per 1000 lines
- Security Test Coverage: {{metrics.testCoverage}}%
- Security Debt: {{metrics.securityDebt}} hours
- False Positive Rate: {{metrics.falsePositiveRate}}%

## Compliance Status
{{#each compliance}}
### {{standard}}
- Status: {{status}}
- Compliance Score: {{score}}%
- Issues:
{{#each issues}}
  - {{description}} ({{severity}})
{{/each}}
- Required Actions:
{{#each actions}}
  - {{this}}
{{/each}}
{{/each}}

## Analysis Configuration
```json
{{configJson}}
```

## Scan Coverage
- Files Analyzed: {{coverage.filesAnalyzed}}
- Lines Analyzed: {{coverage.linesAnalyzed}}
- Patterns Checked: {{coverage.patternsChecked}}
- Analysis Duration: {{coverage.duration}}
