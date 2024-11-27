# Cascade Refactoring Plan

## Metadata
```json
{
  "version": "1.0",
  "analysisDate": "{{date}}",
  "project": "{{projectName}}",
  "stats": {
    "filesAnalyzed": {{filesAnalyzed}},
    "totalIssues": {{totalIssues}},
    "estimatedTime": {{technicalDebt}}
  },
  "cascadeMetadata": {
    "toolCompatibility": {
      "requiredTools": ["edit_file", "view_file"],
      "optionalTools": ["grep_search", "codebase_search"],
      "fallbackTools": {
        "edit_file": "write_to_file",
        "view_file": "grep_search",
        "codebase_search": "grep_search"
      }
    },
    "executionPreferences": {
      "parallelizable": false,
      "requiresUserConfirmation": false,
      "criticalSection": true,
      "maxConcurrentTasks": 1,
      "timeoutMinutes": 30
    },
    "environmentRequirements": {
      "powershell": ">=5.1",
      "dotnet": ">=6.0",
      "git": ">=2.0"
    }
  }
}
```

## Refactoring Tasks
Each task is structured as a complete, atomic operation for Cascade:

{{#each refactoringTasks}}
### Task: {{id}}
```json
{
  "metadata": {
    "id": "{{id}}",
    "name": "{{name}}",
    "priority": {{priority}},
    "type": "{{type}}",
    "complexity": {{complexity}},
    "estimatedTime": {{timeInMinutes}},
    "impact": {
      "scope": "{{scope}}",
      "risk": {{risk}},
      "effort": {{effort}},
      "benefits": [
        {{#each benefits}}
        "{{this}}"
        {{/each}}
      ]
    }
  },
  "files": {
    "primary": {
      "path": "{{primaryFile}}",
      "language": "{{language}}",
      "encoding": "{{encoding}}",
      "requiredAccess": ["read", "write"]
    },
    "related": [
      {{#each relatedFiles}}
      {
        "path": "{{path}}",
        "reason": "{{reason}}",
        "requiredChanges": {{requiredChanges}},
        "dependencies": {
          "imports": {{imports}},
          "exports": {{exports}},
          "references": {{references}}
        }
      }
      {{/each}}
    ]
  },
  "patternContext": {
    "codePattern": {
      "before": {{escapeCode beforeContext}},
      "target": {{escapeCode targetPattern}},
      "after": {{escapeCode afterContext}},
      "indentation": "{{indentation}}",
      "lineEnding": "{{lineEnding}}"
    },
    "similarPatterns": [
      {{#each similarPatterns}}
      {
        "pattern": {{escapeCode pattern}},
        "confidence": {{confidence}},
        "requiresReview": {{requiresReview}},
        "locations": [
          {{#each locations}}
          {
            "file": "{{file}}",
            "line": {{line}},
            "context": {{escapeCode context}}
          }
          {{/each}}
        ]
      }
      {{/each}}
    ],
    "exclusions": [
      {{#each exclusions}}
      {
        "pattern": "{{pattern}}",
        "reason": "{{reason}}"
      }
      {{/each}}
    ]
  },
  "changeStrategy": {
    "approach": "{{approach}}",
    "steps": [
      {{#each steps}}
      {
        "order": {{order}},
        "description": "{{description}}",
        "toolCalls": [
          {{#each toolCalls}}
          {
            "tool": "{{tool}}",
            "params": {
              "targetFile": "{{file}}",
              "changes": [
                {
                  "type": "{{changeType}}",
                  "content": {{escapeCode content}},
                  "contextBefore": {{escapeCode contextBefore}},
                  "contextAfter": {{escapeCode contextAfter}},
                  "lineRange": {
                    "start": {{startLine}},
                    "end": {{endLine}}
                  }
                }
              ],
              "alternativeMatches": [
                {{#each alternativeMatches}}
                {
                  "pattern": {{escapeCode pattern}},
                  "replacement": {{escapeCode replacement}},
                  "confidence": {{confidence}}
                }
                {{/each}}
              ]
            },
            "errorHandling": {
              "retryCount": {{retryCount}},
              "retryDelayMs": {{retryDelayMs}},
              "fallbackStrategy": "{{fallbackStrategy}}",
              "validation": {
                "type": "{{validationType}}",
                "script": {{escapeCode validationScript}},
                "expectedOutput": {{json expectedOutput}},
                "timeout": {{timeout}}
              }
            }
          }
          {{/each}}
        ],
        "verificationStep": {
          "type": "{{verificationType}}",
          "command": "{{verificationCommand}}",
          "expectedResult": {{json expectedResult}},
          "continueOnSuccess": {{continueOnSuccess}}
        }
      }
      {{/each}}
    ]
  },
  "rollback": {
    "strategy": "{{rollbackStrategy}}",
    "steps": [
      {{#each rollbackSteps}}
      {
        "order": {{order}},
        "tool": "{{tool}}",
        "params": {{json params}},
        "verification": "{{verification}}"
      }
      {{/each}}
    ],
    "checkpoints": [
      {{#each checkpoints}}
      {
        "id": "{{id}}",
        "location": "{{location}}",
        "type": "{{type}}"
      }
      {{/each}}
    ]
  },
  "tests": {
    "required": [
      {{#each requiredTests}}
      {
        "type": "{{type}}",
        "path": "{{path}}",
        "setup": {{json setup}},
        "assertions": [
          {{#each assertions}}
          {
            "description": "{{description}}",
            "code": {{escapeCode code}},
            "expected": {{json expected}},
            "cleanup": {{json cleanup}}
          }
          {{/each}}
        ]
      }
      {{/each}}
    ],
    "optional": [
      {{#each optionalTests}}
      {
        "type": "{{type}}",
        "path": "{{path}}",
        "priority": {{priority}},
        "assertions": {{json assertions}}
      }
      {{/each}}
    ]
  },
  "documentation": {
    "changes": [
      {{#each docChanges}}
      {
        "file": "{{file}}",
        "section": "{{section}}",
        "content": {{escapeCode content}}
      }
      {{/each}}
    ],
    "apiImpact": {
      "breaking": {{breakingChanges}},
      "deprecated": {{deprecatedApis}},
      "new": {{newApis}}
    }
  }
}
```
{{/each}}

## Refactoring Recommendations

{{#each refactoringTasks}}
### {{name}}

#### Context
- **Location**: {{primaryFile}}
- **Pattern Type**: {{type}}
- **Priority**: {{priority}}

#### Current Implementation
```{{language}}
{{beforeContext}}
```

#### Suggested Improvement
- **Description**: {{description}}
- **Benefits**: {{benefits}}
- **Potential Impact**: {{impact}}

#### Manual Implementation Steps
1. {{#each steps}}
   - {{this}}
   {{/each}}

#### Validation Checklist
- [ ] Code compiles successfully
- [ ] Tests pass (if applicable)
- [ ] No regression in functionality
- [ ] Code review completed
- [ ] Documentation updated

#### Related Components
- **Affected Files**: {{relatedFiles}}
- **Dependencies**: {{dependencies}}

---
{{/each}}

## Dependency Graph
```json
{
  "taskDependencies": [
    {{#each taskDependencies}}
    {
      "id": "{{id}}",
      "dependsOn": [
        {{#each dependencies}}
        "{{this}}"
        {{/each}}
      ],
      "blockedBy": [
        {{#each blockers}}
        {
          "taskId": "{{taskId}}",
          "reason": "{{reason}}",
          "severity": "{{severity}}"
        }
        {{/each}}
      ],
      "parallelizable": {{parallelizable}},
      "criticalPath": {{criticalPath}}
    }
    {{/each}}
  ],
  "executionPlan": {
    "phases": [
      {{#each phases}}
      {
        "name": "{{name}}",
        "tasks": [
          {{#each tasks}}
          "{{this}}"
          {{/each}}
        ],
        "requiredSuccess": {{requiredSuccess}},
        "rollbackOnFailure": {{rollbackOnFailure}}
      }
      {{/each}}
    ],
    "fallbackPlans": [
      {{#each fallbackPlans}}
      {
        "condition": "{{condition}}",
        "tasks": {{json tasks}}
      }
      {{/each}}
    ]
  }
}
```

## Validation Plan
```json
{
  "stages": [
    {{#each validationStages}}
    {
      "name": "{{name}}",
      "phase": "{{phase}}",
      "checks": [
        {{#each checks}}
        {
          "type": "{{type}}",
          "command": {{escapeCode command}},
          "expectedOutput": {{json expectedOutput}},
          "errorThreshold": {{errorThreshold}},
          "retryStrategy": {
            "maxAttempts": {{maxAttempts}},
            "delayMs": {{delayMs}},
            "backoffFactor": {{backoffFactor}}
          }
        }
        {{/each}}
      ],
      "dependencies": [
        {{#each dependencies}}
        "{{this}}"
        {{/each}}
      ],
      "metrics": {
        "performance": {{performanceMetrics}},
        "quality": {{qualityMetrics}},
        "coverage": {{coverageMetrics}}
      }
    }
    {{/each}}
  ],
  "monitoring": {
    "metrics": [
      {{#each metrics}}
      {
        "name": "{{name}}",
        "type": "{{type}}",
        "threshold": {{threshold}},
        "action": "{{action}}"
      }
      {{/each}}
    ],
    "alerts": [
      {{#each alerts}}
      {
        "condition": "{{condition}}",
        "severity": "{{severity}}",
        "action": "{{action}}"
      }
      {{/each}}
    ]
  }
}

## Additional Notes
- **Testing Requirements**: {{TestingRequirements}}
- **Documentation Updates**: {{DocumentationUpdates}}
- **Review Notes**: {{ReviewNotes}}
