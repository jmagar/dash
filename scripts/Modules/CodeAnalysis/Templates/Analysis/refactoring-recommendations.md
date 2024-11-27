# Refactoring Recommendations

## Overview
- Analysis Date: {{date}}
- Project: {{projectName}}
- Files Analyzed: {{filesAnalyzed}}
- Total Issues: {{totalIssues}}
- Technical Debt Estimate: {{technicalDebt}} hours

## Quick Wins
High impact, low risk changes that can be implemented quickly:

{{#each quickWins}}
### {{name}}
- Files: {{files}}
- Effort: {{effort}} hours
- Impact: {{impact}}/10
- Risk: {{risk}}/10
- Description: {{description}}
- Implementation Steps:
{{#each steps}}
  1. {{this}}
{{/each}}
{{/each}}

## Critical Issues
Issues that need immediate attention due to their impact on code quality:

{{#each criticalIssues}}
### {{name}}
- Severity: {{severity}}/10
- Files Affected: {{filesAffected}}
- Type: {{type}}
- Current Pattern:
```{{language}}
{{currentPattern}}
```
- Recommended Pattern:
```{{language}}
{{recommendedPattern}}
```
- Rationale: {{rationale}}
- Implementation Plan:
{{#each implementationSteps}}
  1. {{this}}
{{/each}}
{{/each}}

## Code Smells
Patterns that indicate potential problems:

{{#each codeSmells}}
### {{pattern}}
- Occurrences: {{count}}
- Locations:
{{#each locations}}
  - {{file}}:{{line}} - {{context}}
{{/each}}
- Why it's a problem: {{explanation}}
- How to fix: {{solution}}
{{/each}}

## Architectural Improvements
Larger scale refactoring opportunities:

{{#each architecturalImprovements}}
### {{name}}
- Scope: {{scope}}
- Current Architecture:
```
{{currentArchitecture}}
```
- Proposed Architecture:
```
{{proposedArchitecture}}
```
- Benefits:
{{#each benefits}}
  - {{this}}
{{/each}}
- Risks:
{{#each risks}}
  - {{this}}
{{/each}}
- Implementation Strategy:
{{#each strategy}}
  1. {{this}}
{{/each}}
{{/each}}

## Performance Optimizations
Refactoring opportunities for better performance:

{{#each performanceOptimizations}}
### {{name}}
- Current Performance: {{currentMetrics}}
- Expected Improvement: {{expectedImprovement}}
- Implementation Complexity: {{complexity}}/10
- Code Changes:
```diff
{{codeChanges}}
```
{{/each}}

## Testing Improvements
Recommendations for better test coverage:

{{#each testingImprovements}}
### {{area}}
- Current Coverage: {{currentCoverage}}%
- Target Coverage: {{targetCoverage}}%
- Missing Test Cases:
{{#each missingTests}}
  - {{this}}
{{/each}}
- Example Test:
```{{language}}
{{exampleTest}}
```
{{/each}}

## Dependency Updates
Recommended updates to dependencies:

{{#each dependencyUpdates}}
### {{package}}
- Current Version: {{currentVersion}}
- Recommended Version: {{recommendedVersion}}
- Breaking Changes:
{{#each breakingChanges}}
  - {{this}}
{{/each}}
- Migration Steps:
{{#each migrationSteps}}
  1. {{this}}
{{/each}}
{{/each}}

## Implementation Plan
Suggested order of implementing changes:

### Phase 1: Immediate Fixes
{{#each phase1}}
1. {{this}}
{{/each}}

### Phase 2: Short-term Improvements
{{#each phase2}}
1. {{this}}
{{/each}}

### Phase 3: Long-term Refactoring
{{#each phase3}}
1. {{this}}
{{/each}}

## Success Metrics
How to measure the success of refactoring:

{{#each metrics}}
### {{name}}
- Current Value: {{currentValue}}
- Target Value: {{targetValue}}
- Measurement Method: {{method}}
{{/each}}

## Risk Assessment
Potential risks and mitigation strategies:

{{#each risks}}
### {{name}}
- Impact: {{impact}}/10
- Probability: {{probability}}/10
- Mitigation Strategy: {{mitigation}}
{{/each}}

## Resources Required
{{#each resources}}
- {{type}}: {{details}}
{{/each}}

## Timeline Estimate
{{#each timeline}}
### {{phase}}
- Duration: {{duration}}
- Dependencies: {{dependencies}}
- Key Milestones:
{{#each milestones}}
  - {{this}}
{{/each}}
{{/each}}
