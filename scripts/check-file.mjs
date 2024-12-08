// Import dependencies
import * as fs from 'fs';
import * as path from 'path';
import typescript from 'typescript';
import { ESLint } from 'eslint';
import { fileURLToPath } from 'url';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let chalk;

// Valid TypeScript file extensions
const validExtensions = ['.ts', '.tsx', '.mts', '.cts'];

// Helper function to shorten file paths for display
function shortenPath(filePath) {
    const parts = filePath.split(path.sep);
    if (parts.length <= 3) return filePath;
    return path.join('...', parts.slice(-3).join(path.sep));
}

// Helper function for consistent headers
async function printHeader(text, color = 'blue') {
    if (!chalk) chalk = (await import('chalk')).default;
    const line = '─'.repeat(text.length + 4);
    console.log('\n' + chalk[color](line));
    console.log(chalk[color]('│ ') + chalk[color].bold(text) + chalk[color](' │'));
    console.log(chalk[color](line) + '\n');
}

// Helper function for info messages
async function printInfo(label, value) {
    if (!chalk) chalk = (await import('chalk')).default;
    console.log(chalk.cyan(label + ': ') + value);
}

// Helper function for success messages
async function printSuccess(text) {
    if (!chalk) chalk = (await import('chalk')).default;
    console.log(chalk.green('✓ ') + text);
}

// Helper function for error messages
async function printError(text, type = 'error') {
    if (!chalk) chalk = (await import('chalk')).default;
    const icon = type === 'error' ? '✗' : '⚠';
    const color = type === 'error' ? 'red' : 'yellow';
    console.log(chalk[color](icon + ' ') + text);
}

// Helper function to print error summary
async function printErrorSummary(errors, warnings) {
    if (!chalk) chalk = (await import('chalk')).default;
    const total = errors.length + warnings.length;
    
    if (total === 0) {
        await printSuccess('No issues found!');
        return;
    }

    if (errors.length > 0) {
        await printHeader(`${errors.length} Error${errors.length === 1 ? '' : 's'}`, 'red');
        errors.forEach(error => printError(error));
    }

    if (warnings.length > 0) {
        await printHeader(`${warnings.length} Warning${warnings.length === 1 ? '' : 's'}`, 'yellow');
        warnings.forEach(warning => printError(warning, 'warning'));
    }
}

// Get the appropriate tsconfig based on file path
function getTsConfigPath(filePath) {
    const configName = 'tsconfig.json';
    let currentDir = path.dirname(path.resolve(filePath));
    
    while (currentDir !== path.parse(currentDir).root) {
        const configPath = path.join(currentDir, configName);
        if (fs.existsSync(configPath)) {
            return configPath;
        }
        currentDir = path.dirname(currentDir);
    }
    
    // Fallback to project root
    return path.join(process.cwd(), configName);
}

// Load and parse tsconfig with all its extended configs
function loadTsConfig(configPath) {
    const { config, error } = typescript.readConfigFile(configPath, typescript.sys.readFile);
    
    if (error) {
        throw new Error(`Failed to read tsconfig: ${error.messageText}`);
    }
    
    const parsedConfig = typescript.parseJsonConfigFileContent(
        config, 
        typescript.sys, 
        path.dirname(configPath)
    );
    
    return parsedConfig;
}

// Run TypeScript and ESLint checks
async function runChecks() {
    if (!chalk) chalk = (await import('chalk')).default;
    
    // Get files from command line arguments
    const files = process.argv.slice(2);

    if (files.length === 0) {
        await printError('Please provide at least one file to check');
        process.exit(1);
    }

    let hasErrors = false;
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const file of files) {
        if (!fs.existsSync(file)) {
            await printError(`File not found: ${file}`);
            continue;
        }

        const ext = path.extname(file);
        if (!validExtensions.includes(ext)) {
            await printError(`File must be a TypeScript file (${validExtensions.join(' or ')})`);
            process.exit(1);
        }

        const shortPath = shortenPath(file);
        await printHeader(`Checking ${shortPath}`);

        // Get TypeScript config
        const configPath = await getTsConfigPath(file);
        await printInfo('TypeScript config', await shortenPath(configPath));

        const errors = [];
        const warnings = [];

        // TypeScript checks
        await printHeader('TypeScript Analysis', 'magenta');
        const tsConfig = await loadTsConfig(configPath);
        const program = typescript.createProgram([file], tsConfig.options);
        const sourceFile = program.getSourceFile(file);

        if (!sourceFile) {
            await printError(`Could not find source file: ${shortPath}`);
            hasErrors = true;
            continue;
        }

        const diagnostics = typescript.getPreEmitDiagnostics(program, sourceFile);
        if (diagnostics.length > 0) {
            diagnostics.forEach(diagnostic => {
                const message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                const location = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start || 0);
                const formattedMessage = location
                    ? `${shortPath}:${location.line + 1}:${location.character + 1} - ${message}`
                    : message;
                
                if (diagnostic.category === typescript.DiagnosticCategory.Error) {
                    errors.push(formattedMessage);
                    totalErrors++;
                } else {
                    warnings.push(formattedMessage);
                    totalWarnings++;
                }
            });
        }

        // ESLint checks
        await printHeader('ESLint Analysis', 'magenta');
        const eslint = new ESLint();
        const results = await eslint.lintFiles([file]);
        
        results[0].messages.forEach(message => {
            const formattedMessage = `${shortPath}:${message.line}:${message.column} - ${message.message} (${message.ruleId})`;
            if (message.severity === 2) {
                errors.push(formattedMessage);
                totalErrors++;
            } else {
                warnings.push(formattedMessage);
                totalWarnings++;
            }
        });

        // Print summary for this file
        await printErrorSummary(errors, warnings);
    }

    // Print overall summary
    await printHeader('Overall Summary', 'cyan');
    console.log(chalk.white(`Files checked: ${chalk.bold(files.length)}`));
    console.log(chalk.red(`Total errors: ${chalk.bold(totalErrors)}`));
    console.log(chalk.yellow(`Total warnings: ${chalk.bold(totalWarnings)}`));

    if (hasErrors) {
        process.exit(1);
    }
}

runChecks().catch(error => {
    printError(`Unexpected error: ${error.message}`);
    process.exit(1);
});
