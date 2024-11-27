# Component Analysis: {{componentName}}

## Overview
- Type: {{componentType}}
- Location: {{location}}
- Lines of Code: {{loc}}
- Complexity Score: {{complexity}}

## Dependencies
### Imports
{{#each imports}}
- {{this}}
{{/each}}

### Exports
{{#each exports}}
- {{this}}
{{/each}}

## State Management
{{#if hasState}}
### State Variables
{{#each stateVariables}}
- {{name}}: {{type}}
{{/each}}

### Effects
{{#each effects}}
- Dependencies: {{dependencies}}
- Purpose: {{purpose}}
{{/each}}
{{/if}}

## Props Interface
```typescript
{{propsInterface}}
```

## Methods
{{#each methods}}
### {{name}}
- Complexity: {{complexity}}
- Lines: {{lines}}
- Dependencies: {{dependencies}}
{{/each}}

## Test Coverage
- Overall Coverage: {{coverage}}%
- Tested Methods: {{testedMethods}}
- Untested Methods: {{untestedMethods}}

## Code Patterns
{{#each patterns}}
### {{category}}
{{#each instances}}
- Line {{line}}: {{description}}
{{/each}}
{{/each}}

## Security Analysis
{{#each securityIssues}}
- {{severity}}: {{description}} (Line {{line}})
{{/each}}

## Performance Considerations
{{#each performanceIssues}}
- {{description}}
{{/each}}

## Recommendations
{{#each recommendations}}
- {{this}}
{{/each}}
