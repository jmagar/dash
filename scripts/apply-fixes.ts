import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface FileFix {
    filePath: string;
    content: string;
}

interface StringReplacer {
    (substring: string, ...args: string[]): string;
}

interface StringSyntaxFix {
    pattern: RegExp;
    replacement: string;
}

interface FunctionSyntaxFix {
    pattern: RegExp;
    replacement: StringReplacer;
}

type SyntaxFix = StringSyntaxFix | FunctionSyntaxFix;

// Common syntax fixes
const SYNTAX_FIXES: SyntaxFix[] = [
    // Fix missing commas in object literals and array literals
    { pattern: /(\w+|\}|\]|\))(\s*\n\s*)(?=['"{\w])/g, replacement: '$1,$2' },
    
    // Fix missing semicolons
    { pattern: /(\w+|\}|\]|\))(\s*\n)/g, replacement: '$1;$2' },
    
    // Fix arrow function return types
    { pattern: /\) =>/g, replacement: '): void =>' },
    
    // Fix missing types in function parameters
    { pattern: /\(([^)]+)\)(?!:)/g, replacement: (match: string, params: string) => {
        return `(${params.split(',').map((param: string) => {
            param = param.trim();
            if (!param.includes(':')) {
                return `${param}: unknown`;
            }
            return param;
        }).join(', ')})`;
    }},
    
    // Fix Redux action types
    { pattern: /PayloadAction<([^>]*)>/g, replacement: 'PayloadAction<$1>' },
    
    // Fix missing type annotations in variable declarations
    { pattern: /(const|let|var)\s+(\w+)\s*=/g, replacement: '$1 $2: unknown =' },
];

// Common import fixes
const COMMON_IMPORTS = {
    'React': "import * as React from 'react';",
    'redux': "import { createSlice, PayloadAction } from '@reduxjs/toolkit';",
    'typescript': "import * as ts from 'typescript';",
    'nestjs': "import { Injectable } from '@nestjs/common';",
};

// Common type mappings for frequently used variables
const commonTypeMap: Record<string, string> = {
    'props': ': Props',
    'state': ': State',
    'event': ': React.SyntheticEvent',
    'response': ': ApiResponse',
    'error': ': Error',
    'data': ': unknown',
    'result': ': unknown',
    'config': ': Config',
    'options': ': Options',
};

// Common React prop types
const reactPropTypes = `
import { ReactNode, SyntheticEvent } from 'react';

interface Props {
    children?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: (event: SyntheticEvent) => void;
}
`;

async function fixSyntax(content: string): Promise<string> {
    let fixed = content;
    
    // Apply syntax fixes
    for (const fix of SYNTAX_FIXES) {
        if (typeof fix.replacement === 'string') {
            fixed = fixed.replace(fix.pattern, fix.replacement);
        } else {
            fixed = fixed.replace(fix.pattern, fix.replacement);
        }
    }
    
    // Fix imports
    const missingImports = new Set<string>();
    for (const [key, value] of Object.entries(COMMON_IMPORTS)) {
        if (fixed.includes(key) && !fixed.includes(`import`) && !fixed.includes(value)) {
            missingImports.add(value);
        }
    }
    
    if (missingImports.size > 0) {
        fixed = Array.from(missingImports).join('\n') + '\n\n' + fixed;
    }
    
    // Add missing imports if needed
    if (fixed.includes('React') && !fixed.includes("from 'react'")) {
        fixed = "import * as React from 'react';\n" + fixed;
    }
    
    // Replace 'any' with 'unknown'
    fixed = fixed.replace(/: any([,}\s])/g, ': unknown$1');
    
    // Add common type annotations
    for (const [name, type] of Object.entries(commonTypeMap)) {
        fixed = fixed.replace(
            new RegExp(`(const|let|var)\\s+(${name})\\s*=`, 'g'),
            `$1 $2${type} =`
        );
    }
    
    // Add missing function return types
    fixed = fixed.replace(
        /function\s+(\w+)\s*\(([^)]*)\)\s*{/g,
        (match, name, params) => {
            // Skip if return type already exists
            if (match.includes(':')) return match;
            return `function ${name}(${params}): void {`;
        }
    );
    
    // Add missing parameter types
    fixed = fixed.replace(
        /\(([^)]+)\)(?!:)/g,
        (match, params) => {
            if (params.trim() === '') return '()';
            return `(${params.split(',').map(param => {
                param = param.trim();
                if (!param.includes(':')) {
                    return `${param}: unknown`;
                }
                return param;
            }).join(', ')})`;
        }
    );
    
    // Add Props interface for React components
    if (fixed.includes('React.Component') || fixed.includes('function') && fixed.includes('return') && fixed.includes('jsx')) {
        if (!fixed.includes('interface Props')) {
            fixed = reactPropTypes + '\n' + fixed;
        }
    }
    
    return fixed;
}

async function fixFile(filePath: string): Promise<void> {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        
        // Skip if file is already valid TypeScript
        const program = ts.createProgram([filePath], {
            noEmit: true,
            allowJs: true,
            checkJs: true,
        });
        const diagnostics = ts.getPreEmitDiagnostics(program);
        if (diagnostics.length === 0) {
            return;
        }
        
        // Apply fixes
        const fixed = await fixSyntax(content);
        
        // Only write if changes were made
        if (fixed !== content) {
            await fs.promises.writeFile(filePath, fixed);
            console.log(`Fixed ${filePath}`);
        }
    } catch (error) {
        console.error(`Error fixing ${filePath}:`, error);
    }
}

async function findTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && !fullPath.includes('node_modules')) {
            files.push(...await findTypeScriptFiles(fullPath));
        } else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

async function applyFixes(): Promise<void> {
    const projectRoot = path.resolve(__dirname, '..');
    const srcPath = path.join(projectRoot, 'src');
    
    try {
        console.log('Finding TypeScript files...');
        const files = await findTypeScriptFiles(srcPath);
        console.log(`Found ${files.length} TypeScript files`);
        
        console.log('Applying fixes...');
        let fixedCount = 0;
        for (const file of files) {
            try {
                await fixFile(file);
                fixedCount++;
                if (fixedCount % 10 === 0) {
                    console.log(`Progress: ${fixedCount}/${files.length} files`);
                }
            } catch (error) {
                console.error(`Error fixing ${file}:`, error);
            }
        }
        
        console.log(`\nCompleted! Fixed ${fixedCount} files`);
    } catch (error) {
        console.error('Error applying fixes:', error);
    }
}

// Install required dependencies
console.log('Installing required dependencies...');
require('child_process').execSync('npm install --save-dev typescript @types/node', { stdio: 'inherit' });

// Run the fixes
console.log('Starting TypeScript fixes...');
applyFixes().catch(console.error);
