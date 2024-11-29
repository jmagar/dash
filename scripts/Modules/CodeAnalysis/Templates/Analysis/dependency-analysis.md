# Dependency Analysis Report

## Overview
- Analysis Date: {{analysisDate}}
- Analysis Tool Version: {{toolVersion}}
- Total Dependencies: {{totalDependencies}}
- Direct Dependencies: {{directDependencies}}
- Dev Dependencies: {{devDependencies}}
- Peer Dependencies: {{peerDependencies}}
- Updates Available: {{updatesAvailable}}

## Dependency Health
- Overall Health Score: {{healthScore}}/100
- Security Score: {{securityScore}}/100
- Maintenance Score: {{maintenanceScore}}/100
- Performance Impact Score: {{performanceScore}}/100
- Issues Found:
  - Security: {{securityIssues}}
  - Outdated: {{outdatedCount}}
  - Deprecated: {{deprecatedCount}}
  - License: {{licenseIssues}}

## Critical Updates Required
{{#each criticalUpdates}}
### {{package}}
- Current Version: {{currentVersion}}
- Required Version: {{requiredVersion}}
- Reason: {{reason}}
- Security Impact: {{securityImpact}}
- CVSS Score: {{cvssScore}}
- Breaking Changes: {{breakingChanges}}
- Update Priority: {{priority}}
- Effort Estimate: {{effort}}
{{/each}}

## Dependency Graph
```mermaid
{{dependencyGraph}}
```

## Resource Impact Analysis
### Bundle Size Impact
{{#each bundleImpact}}
- {{package}}
  - Size: {{size}}
  - Percentage: {{percentage}}%
  - Treeshaking Support: {{treeshaking}}
  - Optimization Potential: {{optimizationPotential}}
  - Recommended Actions: {{recommendations}}
{{/each}}

### Performance Impact
{{#each performanceImpact}}
- {{package}}
  - CPU Usage: {{cpuUsage}}
  - Memory Usage: {{memoryUsage}}
  - Load Time Impact: {{loadTimeImpact}}
  - Optimization Suggestions: {{optimizations}}
{{/each}}

### Unused Dependencies
{{#each unusedDependencies}}
- {{package}}
  - Last Used: {{lastUsed}}
  - Size Impact: {{sizeImpact}}
  - Removal Impact: {{removalImpact}}
  - Affected Files: {{affectedFiles}}
{{/each}}

## Security Analysis
{{#each vulnerabilities}}
### {{package}}
- Severity: {{severity}}
- CVSS Score: {{cvssScore}}
- Vulnerable Versions: {{versions}}
- Fixed Version: {{fixedVersion}}
- CVE: {{cve}}
- Description: {{description}}
- Attack Vector: {{attackVector}}
- Impact:
  - Confidentiality: {{confidentialityImpact}}
  - Integrity: {{integrityImpact}}
  - Availability: {{availabilityImpact}}
- Remediation: {{remediation}}
{{/each}}

## License Compliance
{{#each licenses}}
### {{type}}
- Packages: {{count}}
- Compliance Status: {{compliance}}
- Risk Level: {{risk}}
- Compatibility: {{compatibility}}
- Required Actions: {{actions}}
- Legal Review Status: {{legalStatus}}
{{/each}}

## Version Conflicts
{{#each versionConflicts}}
### {{package}}
- Versions in Use:
{{#each versions}}
  - {{version}} (used by: {{usedBy}})
{{/each}}
- Recommended Version: {{recommendedVersion}}
- Resolution Strategy: {{resolution}}
- Breaking Changes: {{breakingChanges}}
{{/each}}

## Circular Dependencies
{{#each circularDependencies}}
### Chain {{@index}}
```
{{chain}}
```
- Performance Impact: {{performanceImpact}}
- Complexity Score: {{complexityScore}}
- Resolution Strategy: {{resolution}}
- Implementation Plan: {{implementationPlan}}
{{/each}}

## Dependency Usage Analysis
{{#each dependencyUsage}}
### {{package}}
- Import Count: {{importCount}}
- Files Using: {{filesCount}}
- Coverage: {{coverage}}%
- Key Features Used:
{{#each featuresUsed}}
  - {{feature}}: {{usageCount}} uses
{{/each}}
- Unused Exports: {{unusedExports}}
- Optimization Potential: {{optimizationPotential}}
{{/each}}

## Update Impact Analysis
{{#each updateImpact}}
### {{package}}
- Current Version: {{currentVersion}}
- Latest Version: {{latestVersion}}
- Breaking Changes:
{{#each breakingChanges}}
  - {{description}}
  - Impact: {{impact}}
  - Required Changes: {{changes}}
{{/each}}
- Affected Components:
{{#each affectedComponents}}
  - {{component}}: {{impact}}
{{/each}}
- Test Coverage: {{testCoverage}}%
- Update Effort: {{effort}}
- Risk Assessment: {{risk}}
{{/each}}

## Recommendations
### Critical (Must Fix)
{{#each criticalRecommendations}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Priority: {{priority}}
   - Timeline: {{timeline}}
{{/each}}

### High Priority
{{#each highPriorityRecommendations}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Timeline: {{timeline}}
{{/each}}

### Medium Priority
{{#each mediumPriorityRecommendations}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Timeline: {{timeline}}
{{/each}}

## Dependency Management Strategy
### Immediate Actions
{{#each immediateActions}}
1. {{description}}
   - Steps: {{steps}}
   - Resources: {{resources}}
   - Timeline: {{timeline}}
{{/each}}

### Short-term Plan (1-3 months)
{{#each shortTermPlan}}
1. {{description}}
   - Goals: {{goals}}
   - Metrics: {{metrics}}
   - Timeline: {{timeline}}
{{/each}}

### Long-term Strategy (3-12 months)
{{#each longTermStrategy}}
1. {{description}}
   - Objectives: {{objectives}}
   - Success Criteria: {{criteria}}
   - Timeline: {{timeline}}
{{/each}}

## Monitoring Setup
{{#each monitoring}}
### {{metric}}
- Current Value: {{currentValue}}
- Target Value: {{targetValue}}
- Alert Threshold: {{threshold}}
- Monitoring Interval: {{interval}}
- Alert Conditions: {{conditions}}
- Response Plan: {{responsePlan}}
{{/each}}

## Analysis Configuration
```json
{{configJson}}
```

## Scan Coverage
- Files Analyzed: {{coverage.filesAnalyzed}}
- Dependencies Analyzed: {{coverage.dependenciesAnalyzed}}
- Analysis Duration: {{coverage.duration}}
- Scan Depth: {{coverage.depth}}
