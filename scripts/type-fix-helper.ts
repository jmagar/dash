import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const projectRoot = path.resolve(__dirname, '..');

interface TypeErrorInfo {
    file: string;
    line: number;
    character: number;
    code: string;
    message: string;
}

interface ErrorSummary {
    totalErrors: number;
    fileErrors: Map<string, TypeErrorInfo[]>;
    patterns: Map<string, number>;
}

async function getTypeErrors(): Promise<ErrorSummary> {
    try {
        // Run TypeScript compiler for errors from project root
        const { stdout } = await execAsync('npx tsc --noEmit --pretty false', {
            cwd: projectRoot
        });
        
        return parseErrorOutput(stdout);
    } catch (error: any) {
        if (error.stdout) {
            // Parse errors from stdout even if command failed
            return parseErrorOutput(error.stdout.toString());
        }
        throw error;
    }
}

function parseErrorOutput(output: string): ErrorSummary {
    const errors: TypeErrorInfo[] = [];
    const fileErrors = new Map<string, TypeErrorInfo[]>();
    const patterns = new Map<string, number>();

    output.split('\n').forEach((line: string) => {
        const match = line.match(/^(.+)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.+)$/);
        if (match) {
            const [_, file, lineNum, char, code, message] = match;
            const error: TypeErrorInfo = {
                file: path.resolve(file),
                line: parseInt(lineNum),
                character: parseInt(char),
                code: `TS${code}`,
                message
            };
            errors.push(error);

            // Group by file
            const fileErrorList = fileErrors.get(error.file) || [];
            fileErrorList.push(error);
            fileErrors.set(error.file, fileErrorList);

            // Track error patterns
            const count = patterns.get(error.code) || 0;
            patterns.set(error.code, count + 1);
        }
    });

    return {
        totalErrors: errors.length,
        fileErrors,
        patterns
    };
}

async function analyzeDependencies(files: string[]): Promise<Map<string, string[]>> {
    const dependencies = new Map<string, string[]>();
    
    for (const file of files) {
        try {
            const content = await fs.promises.readFile(file, 'utf8');
            const imports = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
            
            const deps = imports.map(imp => {
                const match = imp.match(/from\s+['"]([^'"]+)['"]/);
                return match ? match[1] : '';
            }).filter(Boolean);
            
            dependencies.set(file, deps);
        } catch (error) {
            console.error(`Error analyzing dependencies for ${file}:`, error);
        }
    }
    
    return dependencies;
}

async function generateFixPlan(): Promise<void> {
    try {
        console.log('Analyzing TypeScript errors...');
        const errorSummary = await getTypeErrors();

        console.log('\nError Summary:');
        console.log(`Total Errors: ${errorSummary.totalErrors}`);
        
        console.log('\nError Patterns:');
        errorSummary.patterns.forEach((count, code) => {
            console.log(`${code}: ${count} occurrences`);
        });

        console.log('\nFiles by Error Count:');
        const sortedFiles = Array.from(errorSummary.fileErrors.entries())
            .sort((a, b) => b[1].length - a[1].length);

        const fileList = sortedFiles.map(([file]) => file);
        
        console.log('\nAnalyzing dependencies...');
        const dependencies = await analyzeDependencies(fileList);

        // Generate fix order based on dependencies and error count
        const fixOrder = generateFixOrder(sortedFiles, dependencies);

        console.log('\nProposed Fix Order:');
        fixOrder.forEach((file, index) => {
            const errors = errorSummary.fileErrors.get(file) || [];
            console.log(`${index + 1}. ${file} (${errors.length} errors)`);
        });

        // Write the plan to a file
        const plan = generateMarkdownPlan(errorSummary, fixOrder);
        await fs.promises.writeFile(path.join(projectRoot, 'type-fix-plan.md'), plan);
        
        console.log('\nDetailed fix plan has been written to type-fix-plan.md');
    } catch (error) {
        console.error('Error generating fix plan:', error);
    }
}

function generateFixOrder(
    files: [string, TypeErrorInfo[]][],
    dependencies: Map<string, string[]>
): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    function visit(file: string): void {
        if (visited.has(file)) return;
        visited.add(file);

        const deps = dependencies.get(file) || [];
        for (const dep of deps) {
            const depFile = files.find(([f]) => f.includes(dep))?.[0];
            if (depFile) visit(depFile);
        }

        order.push(file);
    }

    // Start with base DTOs
    files.forEach(([file]) => {
        if (file.includes('/base/')) visit(file);
    });

    // Then other files
    files.forEach(([file]) => visit(file));

    return order;
}

function generateMarkdownPlan(
    summary: ErrorSummary,
    fixOrder: string[]
): string {
    let plan = '# TypeScript Error Fix Plan\n\n';
    
    plan += '## Summary\n';
    plan += `- Total Errors: ${summary.totalErrors}\n`;
    plan += `- Affected Files: ${summary.fileErrors.size}\n\n`;

    plan += '## Error Patterns\n';
    summary.patterns.forEach((count, code) => {
        plan += `- ${code}: ${count} occurrences\n`;
    });

    plan += '\n## Fix Order\n';
    fixOrder.forEach((file, index) => {
        const errors = summary.fileErrors.get(file) || [];
        plan += `### ${index + 1}. ${path.basename(file)}\n`;
        plan += `- Path: ${file}\n`;
        plan += `- Error Count: ${errors.length}\n`;
        plan += '- Errors:\n';
        errors.forEach(error => {
            plan += `  - Line ${error.line}: ${error.message} (${error.code})\n`;
        });
        plan += '\n';
    });

    return plan;
}

// Run the analysis
generateFixPlan().catch(console.error);
