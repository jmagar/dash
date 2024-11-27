# System Analysis Playbook

## Overview
This playbook provides step-by-step instructions for conducting a comprehensive analysis of the Dash project using Cascade's toolset. Each section includes specific tool commands and gateways that must be met before proceeding.

## Phase 0: Discovery & Categorization

### 0.1 Automated Discovery
```bash
# Initial complete file listing
run_command {
  command: "find",
  args: [".", "-type", "f", "-o", "-type", "d"],
  cwd: "/path/to/dash"
}

# Get git tracked files
run_command {
  command: "git",
  args: ["ls-files"],
  cwd: "/path/to/dash"
}

# Find ignored files
run_command {
  command: "git",
  args: ["status", "--ignored"],
  cwd: "/path/to/dash"
}
```

### 0.2 File Categorization Matrix

Each file will be categorized across multiple dimensions:

1. **Purpose Categories**
   - 🏗️ Infrastructure (build, deploy, CI/CD)
   - 📦 Dependencies (package management)
   - 🔧 Configuration
   - 💻 Source Code
   - 📝 Documentation
   - 🧪 Testing
   - 🔒 Security
   - 🎨 Assets
   - 📊 Data

2. **Impact Levels**
   - 🔴 Critical (system-wide impact)
   - 🟡 Major (multi-component impact)
   - 🟢 Minor (localized impact)

3. **Relationship Types**
   - ⬆️ Upstream Dependencies
   - ⬇️ Downstream Dependents
   - ↔️ Peer Dependencies
   - 🔄 Circular Dependencies

4. **Analysis Requirements**
   - 🔍 Security Audit Required
   - 🏃 Performance Analysis Required
   - 📊 Metrics Collection Required
   - 🧪 Test Coverage Required
   - 📝 Documentation Review Required

### 0.3 Automated Analysis Tools

```typescript
// File Analysis Record
interface FileAnalysis {
  path: string;
  size: number;
  lastModified: Date;
  gitHistory: GitCommit[];
  purposeCategories: PurposeCategory[];
  impactLevel: ImpactLevel;
  relationships: Relationship[];
  analysisRequirements: AnalysisRequirement[];
  dependencies: {
    imports: string[];
    exports: string[];
    packageDeps: string[];
  };
  securityImplications: SecurityFlag[];
  performanceImplications: PerformanceMetric[];
  documentation: DocumentationStatus;
}

// Analysis Commands
const analyzeFile = async (path: string): Promise<FileAnalysis> => {
  // 1. Basic File Info
  list_dir(path)
  
  // 2. Content Analysis
  view_file(path, 0, -1)
  
  // 3. Relationships
  related_files(path)
  
  // 4. Pattern Search
  grep_search({
    patterns: [
      "import.*from",
      "require\\(",
      "export.*",
      "security sensitive patterns",
      "performance critical patterns"
    ]
  })
  
  // 5. Semantic Analysis
  codebase_search({
    queries: [
      "security implications",
      "performance critical code",
      "error handling",
      "state management",
      "data flow"
    ]
  })
}
```

### 0.4 Analysis Workflow

1. **Discovery Phase**
   ```bash
   # Generate complete file listing
   run_command { find all files }
   
   # Create initial database
   for each file:
     analyzeFile(file)
     categorize(file)
     mapRelationships(file)
   ```

2. **Categorization Phase**
   ```bash
   # Analyze and categorize each file
   for each file:
     determinePurpose(file)
     assessImpact(file)
     identifyRelationships(file)
     defineAnalysisRequirements(file)
   ```

3. **Relationship Mapping**
   ```bash
   # Map all relationships
   for each file:
     findDependencies(file)
     findDependents(file)
     mapCircularDeps(file)
     visualizeRelationships(file)
   ```

4. **Analysis Planning**
   ```bash
   # Create analysis plan
   for each file:
     prioritizeAnalysis(file)
     determineAnalysisDepth(file)
     scheduleAnalysis(file)
     assignResources(file)
   ```

### 0.5 Gateway Criteria

Before proceeding to detailed analysis:

1. **Completeness Check**
   - [ ] All files discovered and listed
   - [ ] No ignored or hidden files missed
   - [ ] All files categorized
   - [ ] All relationships mapped

2. **Categorization Quality**
   - [ ] Each file has complete categorization
   - [ ] Impact levels assessed
   - [ ] Analysis requirements defined
   - [ ] Security implications identified

3. **Relationship Mapping**
   - [ ] All dependencies mapped
   - [ ] Circular dependencies identified
   - [ ] Impact chains documented
   - [ ] Visualization created

4. **Analysis Planning**
   - [ ] Priority levels assigned
   - [ ] Resource requirements identified
   - [ ] Timeline established
   - [ ] Success criteria defined

### 0.6 Analysis Documentation Structure

```
/dash/docs/analysis/
├── 1-project-structure/
│   ├── directory-analysis.md
│   ├── file-categories.md
│   └── dependencies.md
├── 2-frontend/
│   ├── component-analysis.md
│   ├── state-management.md
│   └── performance.md
├── 3-backend/
│   ├── api-analysis.md
│   ├── database.md
│   └── security.md
├── 4-agent/
│   ├── architecture.md
│   └── integration.md
├── findings/
│   ├── critical-issues.md
│   ├── improvements.md
│   └── tech-debt.md
└── summary/
    ├── metrics.md
    ├── recommendations.md
    └── timeline.md
```

#### Documentation Templates

1. **Analysis Entry Template**
```markdown
# [Component/Feature] Analysis

## Overview
- Purpose:
- Impact Level: (Critical/Major/Minor)
- Related Components:

## Analysis
### Current Implementation
- Key files:
- Dependencies:
- Patterns used:

### Findings
- Issues:
- Risks:
- Technical Debt:

### Recommendations
- Short term:
- Long term:
- Dependencies:

## Follow-up
- [ ] Task 1
- [ ] Task 2
```

2. **Issue Template**
```markdown
# Issue: [Issue Name]

## Description
[Detailed description]

## Impact
- Severity: (Critical/Major/Minor)
- Affected Components:
- Users Affected:

## Technical Details
- Files Involved:
- Root Cause:
- Related Issues:

## Resolution
- Proposed Solution:
- Required Changes:
- Dependencies:

## Status
- [ ] Analyzed
- [ ] Solution Proposed
- [ ] Reviewed
```

3. **Metrics Template**
```markdown
# [Area] Metrics

## Size Metrics
- Total Files:
- Lines of Code:
- Number of Components:

## Complexity Metrics
- Cyclomatic Complexity:
- Dependencies:
- Integration Points:

## Performance Metrics
- Load Time:
- Memory Usage:
- Critical Paths:
```

#### Using Cascade's Tools

1. **For File Analysis**
```bash
# List directories
list_dir "/path/to/analyze"

# View file contents
view_file "/path/to/file" start_line end_line

# Find related files
related_files "/path/to/file"
```

2. **For Pattern Search**
```bash
# Search for patterns
grep_search {
  pattern: "pattern_to_find",
  directory: "/path/to/search",
  files: ["*"],
  case_sensitive: false
}

# For semantic search:
codebase_search {
  query: "specific concept",
  directories: ["/full/path/to/directory"]
}
```

#### Progress Tracking

Use checkboxes in markdown files to track progress:
```markdown
## Analysis Progress
- [x] Project Structure
  - [x] Directory Analysis
  - [ ] Dependency Mapping
- [ ] Frontend
  - [ ] Component Analysis
  - [ ] State Management
```

#### Gateway Criteria

Before moving between sections:
1. All relevant files analyzed
2. Documentation completed
3. Issues documented
4. Metrics collected
5. Next steps identified

## Phase 1: Project Structure Analysis 

### 1.1 Directory Structure Analysis
```bash
# Tool: list_dir
Root level analysis:
- /dash
  - /.github
  - /agent
  - /backups
  - /config
  - /docs
  - /dto-migration
  - /monitoring
  - /prisma
  - /public
  - /scripts
  - /server
  - /src
  - /test
  - /node_modules (for dependency analysis)

Configuration files:
- /.babelrc
- /.dockerignore
- /.env.example
- /.eslintrc.cjs
- /.gitignore
- /.npmrc
- /.prettierrc.js
- /babel.config.js
- /craco.config.cjs
- /docker-compose.dev.yml
- /docker-compose.yml
- /docker-entrypoint.sh
- /Dockerfile
- /Dockerfile.postgres
- /init.sql
- /jest.config.js
- /nginx.conf
- /package.json
- /package-lock.json
- /postcss.config.js
- /tailwind.config.js
- /tsconfig.client.json
- /tsconfig.eslint.json
- /tsconfig.json
- /tsconfig.server.json
- /tsconfig.test.json
- /webpack.config.js

Documentation files:
- /README.md
- /analysis.md
- /cascade-type-fix-guide.md
- /component-analysis.md
- /critical-files.md
- /current-components-analysis.md
- /logging-analysis.md
- /search-implementation.md
- /suggested-additional-components.md
- /type-fix-plan.md
- /type-fix.log
- /typescript-fix-plan.md
- /typescript-fixes.md
```

**Tasks:**
1. For EACH directory:
   - Full file listing with sizes
   - Directory structure depth
   - File type distribution
   - Dependency relationships

2. For EACH configuration file:
   - Complete configuration analysis
   - Dependencies and versions
   - Build and environment settings
   - Cross-file relationships

3. For EACH documentation file:
   - Content analysis
   - Cross-reference with codebase
   - Validation of current accuracy
   - Documentation gaps

4. Dependencies Analysis:
   - Complete node_modules analysis
   - Direct vs peer dependencies
   - Version compatibility
   - Security implications

**Tools to Use:**
```bash
# For each directory:
list_dir "/full/path/to/directory"

# For file content:
view_file "/full/path/to/file" 0 [last_line]

# For relationships:
related_files "/full/path/to/file"

# For patterns:
grep_search {
  directory: "/path",
  pattern: "specific_pattern",
  include_files: ["*"],
  case_sensitive: false
}

# For semantic search:
codebase_search {
  query: "specific concept",
  directories: ["/full/path/to/directory"]
}
```

**Gateway**: 
- Complete inventory of EVERY file and directory
- Full dependency graph
- Configuration relationship map
- Documentation coverage analysis
- No directories or files excluded from analysis

### 1.2 Code Organization Analysis
```bash
# Tool: grep_search
Search patterns:
- "^import.*from"  # Import patterns
- "export (default |{).*"  # Export patterns
- "interface.*{|type.*="  # Type definitions
```

**Tasks:**
1. Analyze import/export patterns
2. Document module boundaries
3. Map type definitions
4. Identify circular dependencies

**Gateway**: Module dependency graph and type hierarchy documentation

## Phase 2: Frontend Analysis 

### 2.1 Component Architecture
```bash
# Tool: codebase_search
Search queries:
- "React component definition patterns"
- "Component prop interfaces"
- "Custom hooks implementation"
- "Context provider patterns"
```

**Tasks:**
1. Map component hierarchy
2. Document prop interfaces
3. Analyze hook usage
4. Review context usage

**Gateway**: Complete component tree with prop and state documentation

### 2.2 State Management
```bash
# Tool: codebase_search + grep_search
Patterns to analyze:
- Redux store configuration
- Context definitions
- Local state usage
- API integration points
```

**Tasks:**
1. Document Redux store structure
2. Map context providers
3. Analyze state flow
4. Review API integration

**Gateway**: State management flow diagram and documentation

### 2.3 Pattern Learning Analysis

```powershell
# Initialize pattern database
./analyze-patterns.ps1 -Init

# Analyze patterns
./analyze-patterns.ps1 -Analyze

# Generate recommendations
./analyze-refactoring.ps1 -GeneratePlaybook
```

#### Pattern Categories
1. **Structural Patterns**
   - Function patterns
   - Class patterns
   - Module patterns
   - Component patterns

2. **Semantic Patterns**
   - State management
   - Data fetching
   - Event handling
   - Authentication
   - Validation
   - Caching

3. **Control Flow**
   - Promise chains
   - Async/await
   - Callbacks
   - Loops
   - Conditional rendering

4. **Dependencies**
   - Import patterns
   - Export patterns
   - Package dependencies
   - Internal dependencies

#### Pattern Metrics
- Usage frequency
- Complexity score
- Test coverage
- Change frequency
- Success rate
- Risk score

#### Learning Process
1. Pattern Detection
   - Code structure analysis
   - Semantic analysis
   - Flow analysis
   - Dependency analysis

2. Pattern Matching
   - Similarity scoring
   - Best match selection
   - Pattern grouping
   - Variant detection

3. Success Tracking
   - Refactoring history
   - Success metrics
   - Failure analysis
   - Impact measurement

4. Recommendation Engine
   - High-impact changes
   - Quick wins
   - Modernization needs
   - Safety analysis

## Phase 3: Backend Analysis 

### 3.1 API Structure
```bash
# Tool: codebase_search
Search areas:
- Route definitions
- Controller logic
- Middleware implementation
- Error handling
```

**Tasks:**
1. Document API endpoints
2. Map request/response flows
3. Analyze middleware chain
4. Review error handling

**Gateway**: Complete API documentation with flow diagrams

### 3.2 Database Integration
```bash
# Tool: grep_search
Patterns:
- Database queries
- Schema definitions
- Migration patterns
- Data access patterns
```

**Tasks:**
1. Document database schema
2. Map data access patterns
3. Review migration strategy
4. Analyze query patterns

**Gateway**: Database schema documentation and access pattern analysis

## Phase 4: Agent Analysis 

### 4.1 Agent Architecture
```bash
# Tool: codebase_search
Focus areas:
- Agent initialization
- Communication patterns
- Task handling
- Error recovery
```

**Tasks:**
1. Document agent lifecycle
2. Map communication flows
3. Analyze task handling
4. Review error handling

**Gateway**: Agent architecture documentation with flow diagrams

### 4.2 Agent-Server Integration
```bash
# Tool: related_files
Analyze:
- Communication protocols
- Data formats
- Security measures
- Error handling
```

**Tasks:**
1. Document integration points
2. Map data flows
3. Review security measures
4. Analyze error handling

**Gateway**: Integration documentation with security analysis

## Phase 5: Performance Analysis 

### 5.1 Frontend Performance
```bash
# Tool: run_command
Commands:
- Bundle size analysis
- Render performance metrics
- Network request analysis
- Memory usage profiling
```

**Tasks:**
1. Measure bundle sizes
2. Profile render performance
3. Analyze network patterns
4. Document memory usage

**Gateway**: Performance metrics baseline documentation

### 5.2 Backend Performance
```bash
# Tool: run_command
Analysis areas:
- Request handling times
- Database query performance
- Memory usage patterns
- CPU utilization
```

**Tasks:**
1. Measure request latency
2. Profile database queries
3. Monitor resource usage
4. Document bottlenecks

**Gateway**: Backend performance metrics documentation

## Phase 6: Security Analysis 

### 6.1 Frontend Security
```bash
# Tool: grep_search
Patterns:
- Authentication logic
- Authorization checks
- Data validation
- Security headers
```

**Tasks:**
1. Review auth implementation
2. Document access controls
3. Analyze data handling
4. Check security headers

**Gateway**: Frontend security assessment document

### 6.2 Backend Security
```bash
# Tool: codebase_search
Focus areas:
- Authentication middleware
- Authorization logic
- Input validation
- Security configurations
```

**Tasks:**
1. Document auth flow
2. Map access controls
3. Review input validation
4. Analyze security config

**Gateway**: Backend security assessment document

## Phase 7: Testing Coverage 

### 7.1 Test Analysis
```bash
# Tool: grep_search + run_command
Areas:
- Unit tests
- Integration tests
- E2E tests
- Test utilities
```

**Tasks:**
1. Map test coverage
2. Document test patterns
3. Analyze test quality
4. Review test utilities

**Gateway**: Test coverage report and quality assessment

## Phase 8: Documentation Analysis 

### 8.1 Code Documentation
```bash
# Tool: grep_search
Patterns:
- JSDoc comments
- README files
- API documentation
- Type definitions
```

**Tasks:**
1. Review code comments
2. Analyze documentation
3. Map API docs
4. Check type docs

**Gateway**: Documentation coverage report

## Final Deliverables 

1. System Architecture Document
   - Complete system map
   - Component relationships
   - Data flows
   - Integration points

2. Performance Baseline
   - Frontend metrics
   - Backend metrics
   - Resource utilization
   - Bottlenecks

3. Security Assessment
   - Security measures
   - Vulnerabilities
   - Recommendations
   - Risk assessment

4. Improvement Recommendations
   - Priority areas
   - Quick wins
   - Long-term improvements
   - Resource requirements

## Progress Tracking

- 🔴 Not Started
- 🟡 In Progress
- 🟢 Complete
- ⭐ Priority Item

Update the state-management-progress.md file as each phase is completed.
