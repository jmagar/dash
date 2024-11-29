# Code Analysis Module

AST-based code analysis module that provides comprehensive analysis of TypeScript/JavaScript, Go, and PowerShell code across your entire project.

## Features

- AST-based analysis (no regex)
- Multi-language support
  - TypeScript/JavaScript (Frontend/Backend)
  - Go (Agent)
  - PowerShell (Infrastructure)
- Pattern detection
  - Security vulnerabilities
  - Performance issues
  - Best practices
  - React patterns
  - API design
- Documentation analysis
  - JSDoc/TSDoc/GoDoc coverage
  - API documentation
  - Code examples
  - Type definitions
- Test coverage analysis
  - Unit tests
  - Integration tests
  - E2E tests
  - Benchmarks
- Configuration analysis
  - Environment variables
  - Feature flags
  - App settings

## Prerequisites

- PowerShell 5.1 or later
- Project must have TypeScript installed (`typescript` package in node_modules)

## Installation

The module is designed to work within the project structure, using the project's TypeScript installation.

## Usage

Single command to analyze your entire project:

```powershell
# Basic usage with default summary output
Invoke-CodeAnalysis

# Analyze specific directory
Invoke-CodeAnalysis -Path "src/server"

# Get detailed report
Invoke-CodeAnalysis -OutputFormat Detailed

# Get JSON output for integration with other tools
Invoke-CodeAnalysis -OutputFormat Json

# Exclude additional directories
Invoke-CodeAnalysis -ExcludeDirs @('node_modules', 'dist', 'build', '.git', 'coverage', 'temp')
```

## Output Formats

### Summary
Quick overview of issues and patterns:
```
Code Analysis Summary
===================
Files Analyzed: 42
Total Issues: 156
Pattern Matches: 89
Documentation Issues: 34
Test Files: 28

Critical Issues: 5
High Priority: 12
Medium Priority: 23

[src/server/auth.ts]
Missing input validation in authentication endpoint
Impact: critical
Category: security
```

### Detailed
Comprehensive analysis with suggestions:
```
Detailed Code Analysis Report
==========================

[src/server/auth.ts]
Language: typescript
Context: backend
Issues: 3
Patterns: 2
Documentation: 1

Critical Issues:
- Missing input validation in authentication endpoint
  Impact: critical
  Category: security
  Suggestion: Implement comprehensive input validation using class-validator

High Priority Issues:
- Improper error handling in token verification
  Impact: high
  Category: reliability
  Suggestion: Implement proper error handling with custom exceptions
```

### JSON
Machine-readable format for integration with other tools:
```json
{
  "summary": {
    "files": 42,
    "issues": 156,
    "patterns": 89,
    "documentation": 34,
    "tests": 28
  },
  "critical": [
    {
      "file": "src/server/auth.ts",
      "issue": {
        "message": "Missing input validation",
        "impact": "critical",
        "category": "security"
      }
    }
  ]
}
```

## What We Check

### Architecture Patterns
- Component composition
- State management
- API design
- Error handling
- Module organization

### Security Patterns
- Input validation
- Authentication
- Authorization
- Data handling
- Command injection

### Performance Patterns
- React rendering
- Database queries
- Resource management
- Caching strategies
- Memory usage

### Documentation
- API documentation
- Type definitions
- Code examples
- Parameter docs
- Return values

### Testing
- Test coverage
- Test patterns
- Mock usage
- Integration tests
- Benchmarks

### Configuration
- Environment vars
- Feature flags
- App settings
- Service config
- Logging setup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details
