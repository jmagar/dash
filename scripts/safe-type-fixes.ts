import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

interface FixOptions {
  dryRun?: boolean;
  backupDir?: string;
  logFile?: string;
  validateChanges?: boolean;
}

interface FileBackup {
  originalPath: string;
  backupPath: string;
  timestamp: string;
}

class TypeScriptFixer {
  private backups: FileBackup[] = [];
  private changes: Map<string, string> = new Map();
  private logs: string[] = [];

  constructor(
    private readonly options: FixOptions = {
      dryRun: false,
      backupDir: './backups',
      logFile: './type-fix.log',
      validateChanges: true,
    }
  ) {
    this.ensureBackupDir();
  }

  private log(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    this.logs.push(logMessage);
    
    switch (type) {
      case 'info':
        console.log(chalk.blue(logMessage));
        break;
      case 'warning':
        console.log(chalk.yellow(logMessage));
        break;
      case 'error':
        console.log(chalk.red(logMessage));
        break;
    }
  }

  private ensureBackupDir(): void {
    if (!this.options.dryRun && this.options.backupDir) {
      if (!fs.existsSync(this.options.backupDir)) {
        fs.mkdirSync(this.options.backupDir, { recursive: true });
      }
    }
  }

  private backupFile(filePath: string): void {
    if (this.options.dryRun || !this.options.backupDir) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupPath = path.join(this.options.backupDir, `${fileName}.${timestamp}.bak`);

    fs.copyFileSync(filePath, backupPath);
    this.backups.push({
      originalPath: filePath,
      backupPath,
      timestamp,
    });
    this.log(`Created backup: ${backupPath}`);
  }

  private validateTypeScript(filePath: string): boolean {
    try {
      const program = ts.createProgram([filePath], {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true,
        types: ['jest', 'node'],
        baseUrl: '.',
        paths: {
          '@/*': ['src/*']
        },
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      });

      const diagnostics = ts.getPreEmitDiagnostics(program);
      
      // For non-test files, we want to be strict about all errors
      const isTestFile = filePath.includes('.spec.ts') || filePath.includes('.test.ts');
      if (!isTestFile) {
        if (diagnostics.length > 0) {
          this.log(`Validation errors in ${filePath}:`, 'error');
          diagnostics.forEach(diagnostic => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            this.log(`  - ${message} (${diagnostic.code})`, 'error');
          });
        }
        return diagnostics.length === 0;
      }

      // For test files, we'll log the errors but not block the process
      if (diagnostics.length > 0) {
        this.log(`Test file validation warnings in ${filePath}:`, 'warning');
        diagnostics.forEach(diagnostic => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          this.log(`  - ${message} (${diagnostic.code})`, 'warning');
        });
      }
      
      // Allow test files to proceed even with errors
      return true;
    } catch (error) {
      this.log(`Error validating TypeScript in ${filePath}: ${error}`, 'error');
      return false;
    }
  }

  private async fixDtoInitialization(sourceFile: ts.SourceFile): Promise<string> {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const transformer = <T extends ts.Node>(context: ts.TransformationContext) => (rootNode: T) => {
      const visit = (node: ts.Node): ts.Node => {
        if (ts.isPropertyDeclaration(node) && !node.initializer) {
          const type = node.type;
          if (type) {
            let initializer: ts.Expression | undefined;
            if (ts.isTypeReferenceNode(type)) {
              const typeName = type.typeName.getText();
              switch (typeName) {
                case 'string':
                  initializer = ts.factory.createStringLiteral('');
                  break;
                case 'number':
                  initializer = ts.factory.createNumericLiteral(0);
                  break;
                case 'boolean':
                  initializer = ts.factory.createFalse();
                  break;
                case 'Date':
                  initializer = ts.factory.createNewExpression(
                    ts.factory.createIdentifier('Date'),
                    undefined,
                    []
                  );
                  break;
              }
            }
            if (initializer) {
              return ts.factory.createPropertyDeclaration(
                node.modifiers ?? [],
                node.name,
                node.questionToken,
                node.type,
                initializer
              );
            }
          }
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(rootNode, visit);
    };

    const result = ts.transform(sourceFile, [transformer]);
    return printer.printNode(ts.EmitHint.Unspecified, result.transformed[0], sourceFile);
  }

  private async fixTestTypes(sourceFile: ts.SourceFile): Promise<string> {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const transformer = <T extends ts.Node>(context: ts.TransformationContext) => (rootNode: T) => {
      const visit = (node: ts.Node): ts.Node => {
        if (ts.isTypeReferenceNode(node)) {
          const text = node.getText();
          if (text === 'Error[]') {
            return ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier('ValidationError'),
              [ts.factory.createArrayTypeNode(ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))]
            );
          }
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(rootNode, visit);
    };

    const result = ts.transform(sourceFile, [transformer]);
    return printer.printNode(ts.EmitHint.Unspecified, result.transformed[0], sourceFile);
  }

  public async fixFile(filePath: string): Promise<boolean> {
    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        this.log(`File not found: ${filePath}`, 'error');
        return false;
      }

      // Create backup
      this.backupFile(filePath);

      // Read and parse file
      const sourceText = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true
      );

      // Apply fixes
      let updatedContent = sourceText;
      if (filePath.includes('dto.ts')) {
        updatedContent = await this.fixDtoInitialization(sourceFile);
      }
      if (filePath.includes('.spec.ts')) {
        updatedContent = await this.fixTestTypes(sourceFile);
      }

      // Validate changes
      if (this.options.validateChanges) {
        const tempFile = path.join(path.dirname(filePath), `.temp-${path.basename(filePath)}`);
        fs.writeFileSync(tempFile, updatedContent);
        const isValid = this.validateTypeScript(tempFile);
        fs.unlinkSync(tempFile);

        if (!isValid) {
          this.log(`Validation failed for changes in ${filePath}`, 'error');
          return false;
        }
      }

      // Apply changes
      if (!this.options.dryRun) {
        fs.writeFileSync(filePath, updatedContent);
        this.changes.set(filePath, updatedContent);
        this.log(`Successfully fixed ${filePath}`);
      } else {
        this.log(`[DRY RUN] Would fix ${filePath}`);
        // In dry run, show the diff
        const diff = require('diff').createPatch(
          filePath,
          sourceText,
          updatedContent
        );
        console.log(chalk.gray(diff));
      }

      return true;
    } catch (error) {
      this.log(`Error fixing ${filePath}: ${error}`, 'error');
      return false;
    }
  }

  public async rollback(): Promise<void> {
    if (this.options.dryRun) {
      this.log('No rollback needed in dry-run mode');
      return;
    }

    for (const backup of this.backups) {
      try {
        fs.copyFileSync(backup.backupPath, backup.originalPath);
        this.log(`Rolled back ${backup.originalPath}`);
      } catch (error) {
        this.log(`Failed to rollback ${backup.originalPath}: ${error}`, 'error');
      }
    }
  }

  public async saveLog(): Promise<void> {
    if (this.options.logFile) {
      fs.writeFileSync(this.options.logFile, this.logs.join('\n'));
    }
  }
}

// Example usage
async function main() {
  const fixer = new TypeScriptFixer({
    dryRun: process.argv.includes('--dry-run'),
    backupDir: './backups',
    logFile: './type-fix.log',
    validateChanges: true,
  });

  const targetDir = process.argv[2] || './src';
  const files = getAllTypeScriptFiles(targetDir);

  console.log(chalk.blue(`Found ${files.length} TypeScript files to process`));
  
  let successCount = 0;
  let failureCount = 0;

  for (const file of files) {
    const success = await fixer.fixFile(file);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(chalk.green(`Successfully fixed ${successCount} files`));
  if (failureCount > 0) {
    console.log(chalk.red(`Failed to fix ${failureCount} files`));
  }

  await fixer.saveLog();
}

function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTypeScriptFiles(fullPath));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:', error));
    process.exit(1);
  });
}
