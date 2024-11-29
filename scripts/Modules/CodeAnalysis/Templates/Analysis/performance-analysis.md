# Performance Analysis Report

## Overview
- Analysis Date: {{analysisDate}}
- Total Files Analyzed: {{totalFiles}}
- Critical Issues: {{criticalIssues}}
- Warnings: {{warnings}}
- Overall Performance Score: {{performanceScore}}/100
- Analysis Tool Version: {{toolVersion}}

## Performance Metrics
### Resource Usage
- Memory Usage: {{memoryUsage}}/{{metrics.performance.memoryThreshold}}
- CPU Utilization: {{cpuUtilization}}%
- Batch Processing: {{batchSize}}/{{metrics.performance.batchSize}}
- Parallel Operations: {{parallelOps}}/{{metrics.performance.maxParallelism}}

### Code Metrics
- Average Complexity: {{complexity}}/{{metrics.complexity.maxAllowed}}
- Warning Level: {{metrics.complexity.warning}}
- Pattern Matches: {{patternMatches}}
- Lines of Code: {{loc}}

## Critical Performance Issues
{{#each criticalIssues}}
### {{file}}
- Issue: {{description}}
- Impact: {{impact}}
- Location: Line {{line}}
- Pattern: {{pattern}}
- Recommendation: {{recommendation}}
- Estimated Improvement: {{improvement}}
- Priority: {{priority}}
{{/each}}

## Code Analysis
### Expensive Operations
{{#each expensiveOperations}}
- Location: {{location}}
- Operation Type: {{type}}
- Cost Metric: {{cost}}
- Memory Impact: {{memoryImpact}}
- CPU Impact: {{cpuImpact}}
- Optimization Strategy: {{optimization}}
- Implementation:
```{{language}}
{{code}}
```
{{/each}}

### Memory Management
{{#each memoryIssues}}
- Component: {{component}}
- Type: {{type}}
- Current Usage: {{currentUsage}}
- Threshold: {{threshold}}
- Impact: {{impact}}
- Resolution: {{resolution}}
- Implementation Details: {{details}}
{{/each}}

### Processing Efficiency
{{#each processingIssues}}
- Operation: {{operation}}
- Current Time: {{currentTime}}ms
- Target Time: {{targetTime}}ms
- Bottleneck: {{bottleneck}}
- Optimization Strategy: {{strategy}}
- Required Changes: {{changes}}
{{/each}}

## Resource Optimization
### Memory Optimization
{{#each memoryOptimizations}}
- Target: {{target}}
- Current Size: {{currentSize}}
- Optimized Size: {{optimizedSize}}
- Strategy: {{strategy}}
- Implementation Priority: {{priority}}
{{/each}}

### CPU Optimization
{{#each cpuOptimizations}}
- Process: {{process}}
- Current Load: {{currentLoad}}%
- Target Load: {{targetLoad}}%
- Optimization Method: {{method}}
- Expected Improvement: {{improvement}}%
{{/each}}

### Batch Processing
{{#each batchProcessing}}
- Operation: {{operation}}
- Current Batch Size: {{currentSize}}
- Optimal Batch Size: {{optimalSize}}
- Processing Time: {{time}}ms
- Memory Usage: {{memory}}MB
- Recommendations: {{recommendations}}
{{/each}}

## Caching Analysis
{{#each caching}}
### {{type}}
- Hit Rate: {{hitRate}}%
- Miss Rate: {{missRate}}%
- Eviction Rate: {{evictionRate}}%
- Cache Size: {{size}}
- TTL: {{ttl}}
- Optimization Suggestions:
{{#each suggestions}}
  - {{this}}
{{/each}}
{{/each}}

## Recommendations
### Immediate Actions
{{#each immediateActions}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Priority: {{priority}}
{{/each}}

### Short Term Optimizations
{{#each shortTermOptimizations}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Timeline: {{timeline}}
{{/each}}

### Long Term Improvements
{{#each longTermImprovements}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Dependencies: {{dependencies}}
{{/each}}

## Performance Monitoring
{{#each monitoring}}
### {{metric}}
- Current Value: {{currentValue}}
- Target Value: {{targetValue}}
- Alert Threshold: {{threshold}}
- Monitoring Interval: {{interval}}
- Alert Conditions: {{conditions}}
{{/each}}

## Performance Budget
{{#each budget}}
### {{metric}}
- Current: {{current}}
- Budget: {{limit}}
- Status: {{status}}
- Trend: {{trend}}
- Actions Required: {{actions}}
{{/each}}

## Analysis Configuration
```json
{{configJson}}
```

## Test Environment
- Hardware: {{environment.hardware}}
- OS: {{environment.os}}
- Runtime: {{environment.runtime}}
- Load Conditions: {{environment.load}}
