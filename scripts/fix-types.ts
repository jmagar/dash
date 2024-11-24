import * as fs from 'fs';
import * as path from 'path';

// Priority order for fixing files
const PRIORITY_ORDER = [
    // Base DTOs (Highest Priority)
    'src/shared/dtos/base/',
    
    // Server DTOs
    'src/server/routes/auth/dto/',
    'src/server/routes/chat/dto/',
    'src/server/routes/filesystem/dto/',
    
    // Client API
    'src/client/api/',
    
    // Components
    'src/client/components/'
];

interface TypeFix {
    filePath: string;
    fixes: {
        line: number;
        original: string;
        fixed: string;
        explanation: string;
    }[];
}

async function* findTypeScriptFiles(dir: string): AsyncGenerator<string> {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
        const res = path.resolve(dir, file.name);
        if (file.isDirectory()) {
            yield* findTypeScriptFiles(res);
        } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
            yield res;
        }
    }
}

async function generateTypeFixes(filePath: string): Promise<TypeFix | null> {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const fixes = [];

        // Look for common type issues
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Missing type annotations
            if (line.match(/const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=/)) {
                if (!line.includes(':')) {
                    fixes.push({
                        line: i + 1,
                        original: line,
                        fixed: `// TODO: Add type annotation\n${line}`,
                        explanation: 'Missing type annotation'
                    });
                }
            }

            // Any type usage
            if (line.includes(': any') || line.includes('as any')) {
                fixes.push({
                    line: i + 1,
                    original: line,
                    fixed: `// TODO: Replace 'any' with specific type\n${line}`,
                    explanation: 'Using any type'
                });
            }

            // Implicit any in function parameters
            const functionMatch = line.match(/function\s+\w+\s*\((.*?)\)/);
            if (functionMatch) {
                const params = functionMatch[1].split(',');
                for (const param of params) {
                    if (param.trim() && !param.includes(':')) {
                        fixes.push({
                            line: i + 1,
                            original: line,
                            fixed: `// TODO: Add parameter type\n${line}`,
                            explanation: 'Function parameter missing type'
                        });
                    }
                }
            }
        }

        return fixes.length > 0 ? { filePath, fixes } : null;
    } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error);
        return null;
    }
}

async function generateFixPlan(): Promise<void> {
    const projectRoot = path.resolve(__dirname, '..');
    const fixesByPriority = new Map<string, TypeFix[]>();

    // Initialize priority groups
    for (const priority of PRIORITY_ORDER) {
        fixesByPriority.set(priority, []);
    }

    // Find and analyze all TypeScript files
    for (const priority of PRIORITY_ORDER) {
        const priorityPath = path.join(projectRoot, priority);
        try {
            for await (const file of findTypeScriptFiles(priorityPath)) {
                const fixes = await generateTypeFixes(file);
                if (fixes) {
                    const group = fixesByPriority.get(priority) || [];
                    group.push(fixes);
                    fixesByPriority.set(priority, group);
                }
            }
        } catch (error) {
            console.error(`Error processing ${priority}:`, error);
        }
    }

    // Generate markdown report
    let report = '# TypeScript Fix Plan\n\n';
    
    for (const [priority, fixes] of fixesByPriority.entries()) {
        if (fixes.length === 0) continue;

        report += `## ${priority}\n\n`;
        for (const fix of fixes) {
            report += `### ${path.relative(projectRoot, fix.filePath)}\n\n`;
            for (const change of fix.fixes) {
                report += `- Line ${change.line}: ${change.explanation}\n`;
                report += '```typescript\n';
                report += `// Original:\n${change.original}\n\n`;
                report += `// Suggested Fix:\n${change.fixed}\n`;
                report += '```\n\n';
            }
        }
    }

    // Write report
    await fs.promises.writeFile(
        path.join(projectRoot, 'typescript-fix-plan.md'),
        report
    );
}

// Generate the fix plan
generateFixPlan().catch(console.error);
