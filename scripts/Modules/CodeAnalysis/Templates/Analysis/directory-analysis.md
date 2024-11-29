# Directory Analysis Report

## Overview
- Analysis Date: {{analysisDate}}
- Directory: {{directoryPath}}
- Total Files: {{totalFiles}}
- Total Size: {{totalSize}}
- Last Modified: {{lastModified}}
- Analysis Tool Version: {{toolVersion}}

## Directory Structure
```
{{directoryTree}}
```

## File Analysis
### File Types
{{#each fileTypes}}
- {{extension}}
  - Count: {{count}} files
  - Percentage: {{percentage}}%
  - Total Size: {{size}}
  - Average Size: {{averageSize}}
  - Largest File: {{largestFile}}
  - Patterns Found: {{patternsFound}}
{{/each}}

### Size Distribution
- Average File Size: {{averageFileSize}}
- Median File Size: {{medianFileSize}}
- Size Range: {{minFileSize}} - {{maxFileSize}}
- Size Distribution:
  - Small (<10KB): {{smallFiles}}
  - Medium (10KB-100KB): {{mediumFiles}}
  - Large (100KB-1MB): {{largeFiles}}
  - Very Large (>1MB): {{veryLargeFiles}}

### Structure Metrics
- Directory Depth: {{directoryDepth}}
- Maximum Nesting Level: {{maxNestingLevel}}
- Average Files per Directory: {{averageFilesPerDirectory}}
- Empty Directories: {{emptyDirectories}}
- Symlinks: {{symlinks}}

## Code Analysis
### Language Distribution
{{#each languages}}
- {{language}}
  - Files: {{fileCount}}
  - Lines of Code: {{loc}}
  - Comment Lines: {{commentLines}}
  - Test Files: {{testFiles}}
  - Complexity Score: {{complexityScore}}
{{/each}}

### Code Quality Metrics
{{#each codeMetrics}}
### {{language}}
- Average Complexity: {{avgComplexity}}/{{../metrics.complexity.maxAllowed}}
- Maximum Complexity: {{maxComplexity}}
- Warning Level: {{../metrics.complexity.warning}}
- Test Coverage: {{testCoverage}}%
- Documentation Coverage: {{docCoverage}}%
- Maintainability Index: {{maintainabilityIndex}}
{{/each}}

## Dependency Analysis
### Internal Dependencies
{{#each internalDependencies}}
- {{from}} -> {{to}}
  - Type: {{type}}
  - Strength: {{strength}}
  - Usage Count: {{usageCount}}
  - Cyclic: {{cyclic}}
{{/each}}

### External Dependencies
{{#each externalDependencies}}
- {{name}}
  - Version: {{version}}
  - Used By: {{usedBy}}
  - Import Count: {{importCount}}
  - Type: {{type}}
{{/each}}

## Pattern Analysis
### Code Patterns
{{#each codePatterns}}
### {{category}}
- Occurrences: {{count}}
- Files Affected: {{filesAffected}}
- Impact Level: {{impact}}
- Common Instances:
{{#each instances}}
  - {{file}}: Line {{line}}
{{/each}}
{{/each}}

### Architecture Patterns
{{#each architecturePatterns}}
- {{pattern}}
  - Usage: {{usage}}
  - Consistency: {{consistency}}%
  - Violations: {{violations}}
{{/each}}

## Security Analysis
### Access Patterns
{{#each accessPatterns}}
- {{pattern}}
  - Risk Level: {{riskLevel}}
  - Files Affected: {{filesAffected}}
  - Recommendation: {{recommendation}}
{{/each}}

### Sensitive Data
{{#each sensitiveData}}
- Type: {{type}}
  - Files: {{files}}
  - Protection Level: {{protection}}
  - Risk Assessment: {{risk}}
{{/each}}

## Performance Analysis
### File System Impact
- Read Operations: {{readOps}}
- Write Operations: {{writeOps}}
- Average Access Time: {{avgAccessTime}}
- Cache Usage: {{cacheUsage}}%

### Resource Usage
- Disk Space Utilization: {{diskUtilization}}%
- Index Size: {{indexSize}}
- Memory Impact: {{memoryImpact}}
- I/O Pattern: {{ioPattern}}

## Recommendations
### High Priority
{{#each highPriorityRecommendations}}
1. {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
   - Priority: {{priority}}
{{/each}}

### Structure Improvements
{{#each structureRecommendations}}
1. {{description}}
   - Current State: {{currentState}}
   - Target State: {{targetState}}
   - Benefits: {{benefits}}
{{/each}}

### Optimization Opportunities
{{#each optimizationRecommendations}}
1. {{description}}
   - Potential Impact: {{impact}}
   - Implementation: {{implementation}}
   - Expected Benefit: {{benefit}}
{{/each}}

## Maintenance Guidelines
### Best Practices
{{#each bestPractices}}
- {{practice}}
  - Current Status: {{status}}
  - Implementation Guide: {{guide}}
{{/each}}

### Monitoring Recommendations
{{#each monitoring}}
- {{metric}}
  - Current Value: {{currentValue}}
  - Target Value: {{targetValue}}
  - Alert Threshold: {{threshold}}
{{/each}}

## Analysis Configuration
```json
{{configJson}}
```

## Scan Coverage
- Directories Scanned: {{coverage.directoriesScanned}}
- Files Analyzed: {{coverage.filesAnalyzed}}
- Analysis Duration: {{coverage.duration}}
- Excluded Patterns: {{coverage.excludedPatterns}}
