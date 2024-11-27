# Performance Analysis Report

## Overview
- Analysis Date: {{date}}
- Total Files Analyzed: {{totalFiles}}
- Critical Issues: {{criticalIssues}}
- Warnings: {{warnings}}
- Overall Performance Score: {{performanceScore}}/100

## Performance Metrics
### Load Time Analysis
- Average Load Time: {{avgLoadTime}}ms
- P95 Load Time: {{p95LoadTime}}ms
- P99 Load Time: {{p99LoadTime}}ms
- Time to First Byte: {{ttfb}}ms
- Time to Interactive: {{tti}}ms

### Resource Usage
- Memory Usage: {{memoryUsage}}
- CPU Utilization: {{cpuUtilization}}%
- Network Requests: {{networkRequests}}
- Bundle Size: {{bundleSize}}

## Critical Performance Issues
{{#each criticalIssues}}
### {{file}}
- Issue: {{description}}
- Impact: {{impact}}
- Line: {{line}}
- Recommendation: {{recommendation}}
- Estimated Improvement: {{improvement}}
{{/each}}

## Code Analysis
### Expensive Operations
{{#each expensiveOperations}}
- Location: {{location}}
- Operation: {{operation}}
- Cost: {{cost}}
- Suggestion: {{suggestion}}
{{/each}}

### Memory Leaks
{{#each memoryLeaks}}
- Component: {{component}}
- Type: {{type}}
- Impact: {{impact}}
- Fix: {{fix}}
{{/each}}

### Render Performance
{{#each renderIssues}}
- Component: {{component}}
- Re-renders: {{reRenderCount}}
- Cause: {{cause}}
- Solution: {{solution}}
{{/each}}

## Bundle Analysis
### Size by Entry Point
{{#each bundleEntries}}
- {{name}}: {{size}}
{{/each}}

### Large Dependencies
{{#each largeDependencies}}
- {{name}}: {{size}}
  - Usage: {{usage}}
  - Alternative: {{alternative}}
{{/each}}

### Code Splitting Opportunities
{{#each codeSplitting}}
- {{route}}: {{recommendation}}
{{/each}}

## Network Performance
### API Calls
{{#each apiCalls}}
- Endpoint: {{endpoint}}
- Average Response Time: {{responseTime}}ms
- Cache Hit Rate: {{cacheRate}}%
- Optimization: {{optimization}}
{{/each}}

### Asset Loading
{{#each assets}}
- Type: {{type}}
- Size: {{size}}
- Loading Strategy: {{strategy}}
- Optimization: {{optimization}}
{{/each}}

## Database Performance
{{#each databaseQueries}}
### {{query}}
- Average Execution Time: {{executionTime}}ms
- Index Usage: {{indexUsage}}
- Rows Examined: {{rowsExamined}}
- Optimization: {{optimization}}
{{/each}}

## Caching Analysis
{{#each caching}}
### {{type}}
- Hit Rate: {{hitRate}}%
- Miss Rate: {{missRate}}%
- Eviction Rate: {{evictionRate}}%
- Recommendations: {{recommendations}}
{{/each}}

## Recommendations
### Immediate Actions
{{#each immediateActions}}
1. {{this}}
{{/each}}

### Short Term
{{#each shortTerm}}
1. {{this}}
{{/each}}

### Long Term
{{#each longTerm}}
1. {{this}}
{{/each}}

## Monitoring Recommendations
{{#each monitoring}}
- Metric: {{metric}}
- Current Value: {{currentValue}}
- Target Value: {{targetValue}}
- Alert Threshold: {{threshold}}
{{/each}}

## Performance Budget
{{#each budget}}
### {{metric}}
- Current: {{current}}
- Budget: {{limit}}
- Status: {{status}}
{{/each}}
