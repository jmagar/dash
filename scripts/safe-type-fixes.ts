import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const isDryRun = process.argv.includes('--dry-run');
const targetDir = process.argv[2];

// Define source directories to process
const sourceDirectories = [
    'src/server',
    'src/client',
    'src/types',
    'src/shared'
];

function loadTsConfig(searchPath: string = process.cwd()): ts.ParsedCommandLine {
    const configPath = ts.findConfigFile(searchPath, ts.sys.fileExists, 'tsconfig.json');
    if (!configPath) {
        throw new Error("Could not find a valid 'tsconfig.json'.");
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
        throw new Error(`Failed to read tsconfig.json: ${configFile.error.messageText}`);
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath),
        undefined,
        configPath
    );

    if (parsedConfig.errors.length) {
        throw new Error(`Failed to parse tsconfig.json: ${parsedConfig.errors.map(e => e.messageText).join(', ')}`);
    }

    return parsedConfig;
}

function createLanguageService(files: string[]): ts.LanguageService {
    const config = loadTsConfig();
    const compilerOptions = config.options;
    
    const servicesHost: ts.LanguageServiceHost = {
        getScriptFileNames: () => files,
        getScriptVersion: () => "0",
        getScriptSnapshot: (fileName) => {
            if (!fs.existsSync(fileName)) {
                return undefined;
            }
            return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
        },
        getCurrentDirectory: () => process.cwd(),
        getCompilationSettings: () => compilerOptions,
        getDefaultLibFileName: () => ts.getDefaultLibFilePath(compilerOptions),
        fileExists: (path) => fs.existsSync(path),
        readFile: (path) => fs.existsSync(path) ? fs.readFileSync(path).toString() : undefined,
        readDirectory: ts.sys.readDirectory,
        directoryExists: (path) => fs.existsSync(path),
        getDirectories: ts.sys.getDirectories,
        getNewLine: () => ts.sys.newLine,
        useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
        getCustomTransformers: () => undefined
    };

    return ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
}

interface TextChange {
    start: number;
    end: number;
    newText: string;
}

function applyChanges(content: string, changes: TextChange[]): string {
    // Sort changes in reverse order to avoid position shifts
    changes.sort((a, b) => b.start - a.start);
    
    let result = content;
    for (const change of changes) {
        result = result.slice(0, change.start) + change.newText + result.slice(change.end);
    }
    return result;
}

function fixTypes(filePath: string, service: ts.LanguageService): void {
    const sourceFile = service.getProgram()?.getSourceFile(filePath);
    if (!sourceFile) {
        console.error(`Could not get source file for ${filePath}`);
        return;
    }

    const diagnostics = [
        ...service.getSemanticDiagnostics(filePath),
        ...service.getSyntacticDiagnostics(filePath)
    ];

    if (diagnostics.length === 0) {
        return;
    }

    console.log(`\nProcessing ${path.relative(process.cwd(), filePath)}`);
    console.log(`Found ${diagnostics.length} type issues`);

    let content = fs.readFileSync(filePath, 'utf-8');
    const changes: TextChange[] = [];

    for (const diagnostic of diagnostics) {
        if (!diagnostic.start || !diagnostic.length) continue;

        const fixes = service.getCodeFixesAtPosition(
            filePath,
            diagnostic.start,
            diagnostic.start + diagnostic.length,
            [diagnostic.code],
            {},
            {}
        );

        for (const fix of fixes) {
            console.log(`- ${diagnostic.messageText}`);
            console.log(`  Applying fix: ${fix.description}`);

            for (const change of fix.changes) {
                for (const textChange of change.textChanges) {
                    changes.push({
                        start: textChange.span.start,
                        end: textChange.span.start + textChange.span.length,
                        newText: textChange.newText
                    });
                }
            }
        }
    }

    if (changes.length > 0) {
        // Sort changes in reverse order to prevent position shifts
        changes.sort((a, b) => b.start - a.start);

        if (isDryRun) {
            console.log('Changes that would be made:');
            for (const change of changes) {
                const oldText = content.substring(change.start, change.end);
                console.log(`  ${oldText} -> ${change.newText}`);
            }
        } else {
            const newContent = applyChanges(content, changes);
            fs.writeFileSync(filePath, newContent);
            console.log(`Applied ${changes.length} fixes`);
        }
    } else {
        console.log('No automatic fixes available');
    }
}

function collectTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) {
        console.log(` Directory not found: ${dir}`);
        return files;
    }
    
    function traverse(currentDir: string) {
        const entries = fs.readdirSync(currentDir);
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                if (!['node_modules', 'dist'].includes(entry)) {
                    traverse(fullPath);
                }
            } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
                files.push(fullPath);
            }
        }
    }
    
    traverse(dir);
    return files;
}

async function main() {
    try {
        console.log(`Starting type fixes${isDryRun ? ' (DRY RUN)' : ''}...`);

        // Load project configuration
        const config = loadTsConfig();
        console.log('Loaded TypeScript configuration');

        // Process each source directory
        let allFiles: string[] = [];
        
        if (targetDir) {
            // If targetDir is specified, only process that directory
            const dirPath = path.resolve(process.cwd(), targetDir);
            console.log(`\nScanning ${targetDir}...`);
            const files = collectTypeScriptFiles(dirPath);
            console.log(`Found ${files.length} TypeScript files in ${targetDir}`);
            allFiles.push(...files);
        } else {
            // Otherwise process all source directories
            for (const dir of sourceDirectories) {
                const dirPath = path.resolve(process.cwd(), dir);
                console.log(`\nScanning ${dir}...`);
                const files = collectTypeScriptFiles(dirPath);
                console.log(`Found ${files.length} TypeScript files in ${dir}`);
                allFiles.push(...files);
            }
        }

        console.log(`\nTotal TypeScript files found: ${allFiles.length}`);

        if (allFiles.length === 0) {
            console.log('No TypeScript files found to process.');
            return;
        }

        const service = createLanguageService(allFiles);

        console.log('\nProcessing files...\n');
        for (const file of allFiles) {
            fixTypes(file, service);
        }

        console.log('\nType fix process completed!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main().catch(console.error);
