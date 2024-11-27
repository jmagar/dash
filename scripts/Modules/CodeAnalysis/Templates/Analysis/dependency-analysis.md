# Dependency Analysis Report

## Overview
- Analysis Date: {{date}}
- Total Dependencies: {{totalDependencies}}
- Direct Dependencies: {{directDependencies}}
- Dev Dependencies: {{devDependencies}}
- Peer Dependencies: {{peerDependencies}}
- Dependency Updates Available: {{updatesAvailable}}

## Dependency Health
- Overall Health Score: {{healthScore}}/100
- Security Issues: {{securityIssues}}
- Outdated Packages: {{outdatedCount}}
- Deprecated Packages: {{deprecatedCount}}
- License Issues: {{licenseIssues}}

## Critical Updates Required
{{#each criticalUpdates}}
### {{package}}
- Current Version: {{currentVersion}}
- Required Version: {{requiredVersion}}
- Reason: {{reason}}
- Security Impact: {{securityImpact}}
- Breaking Changes: {{breakingChanges}}
- Update Priority: {{priority}}
{{/each}}

## Dependency Graph
```mermaid
{{dependencyGraph}}
```

## Size Analysis
### Bundle Impact
{{#each bundleImpact}}
- {{package}}: {{size}} ({{percentage}}% of total)
{{/each}}

### Unused Dependencies
{{#each unusedDependencies}}
- {{package}} (Last used: {{lastUsed}})
{{/each}}

## Security Vulnerabilities
{{#each vulnerabilities}}
### {{package}}
- Severity: {{severity}}
- Vulnerable Versions: {{versions}}
- Fixed Version: {{fixedVersion}}
- CVE: {{cve}}
- Description: {{description}}
- Remediation: {{remediation}}
{{/each}}

## License Analysis
{{#each licenses}}
### {{type}}
- Packages: {{count}}
- Compliance Status: {{compliance}}
- Risk Level: {{risk}}
- Action Required: {{action}}
{{/each}}

## Duplicate Dependencies
{{#each duplicates}}
### {{package}}
- Versions Found: {{versions}}
- Used By: {{usedBy}}
- Resolution: {{resolution}}
{{/each}}

## Circular Dependencies
{{#each circularDependencies}}
### Chain {{@index}}
```
{{chain}}
```
- Impact: {{impact}}
- Resolution: {{resolution}}
{{/each}}

## Dependency Usage
{{#each dependencyUsage}}
### {{package}}
- Import Count: {{importCount}}
- Files Using: {{filesCount}}
- Key Functionalities Used:
{{#each functionalitiesUsed}}
  - {{this}}
{{/each}}
- Unused Exports: {{unusedExports}}
{{/each}}

## Update Impact Analysis
{{#each updateImpact}}
### {{package}}
- Current Version: {{currentVersion}}
- Latest Version: {{latestVersion}}
- Breaking Changes:
{{#each breakingChanges}}
  - {{this}}
{{/each}}
- Affected Files:
{{#each affectedFiles}}
  - {{this}}
{{/each}}
- Update Effort: {{effort}}
- Risk Level: {{risk}}
{{/each}}

## Recommendations
### High Priority
{{#each highPriorityRecommendations}}
1. {{this}}
{{/each}}

### Medium Priority
{{#each mediumPriorityRecommendations}}
1. {{this}}
{{/each}}

### Low Priority
{{#each lowPriorityRecommendations}}
1. {{this}}
{{/each}}

## Dependency Maintenance Plan
### Immediate Actions
{{#each immediateActions}}
1. {{this}}
{{/each}}

### Short-term Plan
{{#each shortTermPlan}}
1. {{this}}
{{/each}}

### Long-term Strategy
{{#each longTermStrategy}}
1. {{this}}
{{/each}}

## Best Practices
{{#each bestPractices}}
- {{this}}
{{/each}}

## Monitoring Recommendations
{{#each monitoring}}
### {{metric}}
- Current Value: {{currentValue}}
- Target Value: {{targetValue}}
- Alert Threshold: {{threshold}}
- Monitoring Strategy: {{strategy}}
{{/each}}
