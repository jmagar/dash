# Component Analysis: {{componentName}}

## Overview
- Type: {{componentType}}
- Location: {{location}}
- Lines of Code: {{loc}}
- Complexity Score: {{complexityScore}}/{{metrics.complexity.maxAllowed}}
- Analysis Date: {{analysisDate}}

## Dependencies
### Imports
{{#each imports}}
- {{name}} ({{type}})
{{/each}}

### Exports
{{#each exports}}
- {{name}}: {{type}}
{{/each}}

## State Management
{{#if hasState}}
### State Variables
{{#each stateVariables}}
- {{name}}: {{type}}
  - Usage: {{usage}}
  - Scope: {{scope}}
{{/each}}

### Effects
{{#each effects}}
- Dependencies: {{dependencies}}
- Purpose: {{purpose}}
- Performance Impact: {{performanceImpact}}
{{/each}}
{{/if}}

## Props Interface
```typescript
{{propsInterface}}
```

## Methods
{{#each methods}}
### {{name}}
- Complexity: {{complexity}}/{{../metrics.complexity.maxAllowed}}
- Lines: {{lines}}
- Dependencies: {{dependencies}}
- Performance Profile:
  - CPU: {{performance.cpu}}
  - Memory: {{performance.memory}}
  - Calls: {{performance.calls}}
{{/each}}

## Test Coverage
- Overall Coverage: {{coverage}}%
- Tested Methods: {{testedMethods}}
- Untested Methods: {{untestedMethods}}
- Test Quality Score: {{testQualityScore}}/100

## Code Patterns
{{#each patterns}}
### {{category}} ({{type}})
{{#each instances}}
- Line {{line}}: {{description}}
  - Impact: {{impact}}
  - Confidence: {{confidence}}
{{/each}}
{{/each}}

## Security Analysis
{{#each securityIssues}}
- Severity: {{severity}}
- Description: {{description}}
- Location: Line {{line}}
- CVSS Score: {{cvssScore}}
- Recommendation: {{recommendation}}
{{/each}}

## Performance Considerations
{{#each performanceIssues}}
- Type: {{type}}
- Description: {{description}}
- Impact: {{impact}}
- Recommendation: {{recommendation}}
- Estimated Improvement: {{improvement}}
{{/each}}

## Recommendations
### High Priority
{{#each recommendations.high}}
- {{this}}
{{/each}}

### Medium Priority
{{#each recommendations.medium}}
- {{this}}
{{/each}}

### Best Practices
{{#each recommendations.best}}
- {{this}}
{{/each}}

## Metrics Summary
- Complexity Score: {{metrics.complexity}}/{{metrics.maxComplexity}}
- Performance Score: {{metrics.performance}}/100
- Security Score: {{metrics.security}}/100
- Maintainability Score: {{metrics.maintainability}}/100
- Overall Quality Score: {{metrics.overall}}/100

## Analysis Context
- Language: {{language}}
- Framework: {{framework}}
- Analysis Tool Version: {{toolVersion}}
- Configuration:
  ```json
  {{configJson}}
