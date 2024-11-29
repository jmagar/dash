# Refactoring Recommendations Report

## Overview
- Analysis Date: {{analysisDate}}
- Project: {{projectName}}
- Files Analyzed: {{filesAnalyzed}}
- Total Issues: {{totalIssues}}
- Technical Debt: {{technicalDebt}} hours
- Analysis Tool Version: {{toolVersion}}

## Executive Summary
- Critical Issues: {{criticalIssues}}
- High Priority Issues: {{highPriorityIssues}}
- Medium Priority Issues: {{mediumPriorityIssues}}
- Low Priority Issues: {{lowPriorityIssues}}
- Overall Code Health Score: {{codeHealthScore}}/100

## Metrics Summary
```json
{
  "complexity": {
    "average": {{metrics.complexity.average}},
    "max": {{metrics.complexity.maxAllowed}},
    "warning": {{metrics.complexity.warning}},
    "filesExceedingThreshold": {{metrics.complexity.exceedingFiles}}
  },
  "performance": {
    "score": {{metrics.performance.score}},
    "batchSize": {{metrics.performance.batchSize}},
    "maxParallelism": {{metrics.performance.maxParallelism}},
    "memoryUsage": {{metrics.performance.memoryUsage}}
  },
  "security": {
    "score": {{metrics.security.score}},
    "criticalIssues": {{metrics.security.criticalIssues}},
    "highRiskPatterns": {{metrics.security.highRiskPatterns}}
  }
}
```

## Refactoring Tasks
{{#each refactoringTasks}}
### Task {{id}}: {{name}}

#### Context
- Priority: {{priority}}
- Type: {{type}}
- Complexity: {{complexity}}/{{../metrics.complexity.maxAllowed}}
- Estimated Time: {{timeInMinutes}} minutes
- Risk Level: {{risk}}

#### Location
- Primary File: {{primaryFile}}
- Language: {{language}}
- Lines: {{lineRange.start}} - {{lineRange.end}}

#### Current Implementation
```{{language}}
{{beforeContext}}
{{targetPattern}}
{{afterContext}}
```

#### Issue Analysis
- Pattern Type: {{pattern.type}}
- Confidence: {{pattern.confidence}}
- Impact:
  - Performance: {{impact.performance}}
  - Maintainability: {{impact.maintainability}}
  - Security: {{impact.security}}

#### Proposed Solution
```{{language}}
{{proposedImplementation}}
```

#### Benefits
{{#each benefits}}
- {{this}}
{{/each}}

#### Implementation Steps
{{#each steps}}
1. {{description}}
   - Tool: {{tool}}
   - Validation: {{validation}}
   - Rollback: {{rollback}}
{{/each}}

#### Dependencies
- Required Changes:
{{#each dependencies}}
  - {{file}}: {{change}}
{{/each}}

#### Testing Requirements
- Unit Tests: {{testing.unit}}
- Integration Tests: {{testing.integration}}
- Performance Tests: {{testing.performance}}

#### Validation Checklist
- [ ] Code compiles successfully
- [ ] All tests pass
- [ ] Performance metrics within thresholds
- [ ] Security checks passed
- [ ] Documentation updated
- [ ] Code review completed

---
{{/each}}

## Implementation Strategy
### Phase 1: Critical Issues
{{#each criticalPhase}}
1. {{task}}
   - Impact: {{impact}}
   - Dependencies: {{dependencies}}
   - Timeline: {{timeline}}
{{/each}}

### Phase 2: High Priority
{{#each highPriorityPhase}}
1. {{task}}
   - Impact: {{impact}}
   - Dependencies: {{dependencies}}
   - Timeline: {{timeline}}
{{/each}}

### Phase 3: Medium Priority
{{#each mediumPriorityPhase}}
1. {{task}}
   - Impact: {{impact}}
   - Dependencies: {{dependencies}}
   - Timeline: {{timeline}}
{{/each}}

## Dependency Graph
```mermaid
{{dependencyGraph}}
```

## Risk Assessment
### High Risk Changes
{{#each highRiskChanges}}
- {{description}}
  - Impact: {{impact}}
  - Mitigation: {{mitigation}}
  - Fallback: {{fallback}}
{{/each}}

### Dependencies at Risk
{{#each dependencyRisks}}
- {{package}}
  - Current Version: {{currentVersion}}
  - Target Version: {{targetVersion}}
  - Breaking Changes: {{breakingChanges}}
  - Migration Path: {{migrationPath}}
{{/each}}

## Performance Impact
### Before Refactoring
{{#each beforeMetrics}}
- {{metric}}: {{value}}
{{/each}}

### Projected After Refactoring
{{#each projectedMetrics}}
- {{metric}}: {{value}}
{{/each}}

## Monitoring Plan
### Key Metrics
{{#each monitoringMetrics}}
- {{name}}
  - Current: {{current}}
  - Target: {{target}}
  - Alert Threshold: {{threshold}}
{{/each}}

### Validation Tests
{{#each validationTests}}
- {{name}}
  - Type: {{type}}
  - Criteria: {{criteria}}
  - Frequency: {{frequency}}
{{/each}}

## Resource Requirements
- Development Time: {{resources.devTime}} hours
- Testing Time: {{resources.testTime}} hours
- Review Time: {{resources.reviewTime}} hours
- Total Effort: {{resources.totalEffort}} hours

## Documentation Updates
### API Changes
{{#each apiChanges}}
- {{type}}
  - Before: {{before}}
  - After: {{after}}
  - Migration Guide: {{migration}}
{{/each}}

### Required Updates
{{#each documentationUpdates}}
- {{file}}
  - Section: {{section}}
  - Changes: {{changes}}
{{/each}}

## Analysis Configuration
```json
{{configJson}}
```

## Scan Coverage
- Files Scanned: {{coverage.filesScanned}}
- Lines Analyzed: {{coverage.linesAnalyzed}}
- Patterns Checked: {{coverage.patternsChecked}}
- Analysis Duration: {{coverage.duration}}
