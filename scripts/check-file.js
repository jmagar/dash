// Import dependencies
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { ESLint } = require('eslint');

const file = process.argv[2];
if (!file) {
    console.error(chalk.red('Error: Missing file path'));
    console.error(chalk.cyan('Usage: node check-file.js <file-path>'));
    process.exit(1);
}

// Validate file exists and has correct extension
const validExtensions = ['.ts', '.tsx'];
if (!fs.existsSync(file)) {
    console.error(chalk.red(`Error: File '${file}' does not exist`));
    process.exit(1);
}
const ext = path.extname(file);
if (!validExtensions.includes(ext)) {
    console.error(chalk.red(`Error: File must be a TypeScript file (${validExtensions.join(' or ')})`));
    process.exit(1);
}

// Add color constants for better readability
// const colors = {
//     reset: '\x1b[0m',
//     bright: '\x1b[1m',
//     dim: '\x1b[2m',
//     red: '\x1b[31m',
//     green: '\x1b[32m',
//     yellow: '\x1b[33m',
//     blue: '\x1b[34m',
//     cyan: '\x1b[36m',
//     gray: '\x1b[90m'
// };

// Helper function for consistent headers
function printHeader(text) {
    const line = '─'.repeat(text.length + 4);
    console.log('\n' + chalk.blue(line));
    console.log(chalk.blue('│ ') + chalk.blueBright(text) + chalk.blue(' │'));
    console.log(chalk.blue(line) + '\n');
}

// Helper function for info messages
function printInfo(label, value) {
    console.log(chalk.cyan(label + ':') + ' ' + value);
}

// Helper function for success messages
function printSuccess(text) {
    console.log('\n' + chalk.green('✓ ' + text) + '\n');
}

// Helper function for error messages
function printError(text) {
    console.error(chalk.red('✗ ' + text));
}

// Get the appropriate tsconfig based on file path
function getTsConfigPath(filePath) {
    const normalizedPath = path.normalize(filePath);
    const configs = {
        'src/server/': 'tsconfig.server.json',
        'src/client/': 'tsconfig.client.json',
        'src/shared/': 'tsconfig.shared.json'
    };

    for (const [dir, config] of Object.entries(configs)) {
        if (normalizedPath.includes(dir)) {
            return config;
        }
    }
    return 'tsconfig.json'; // Default to root tsconfig
}

// Load and parse tsconfig with all its extended configs
function loadTsConfig(configPath) {
    if (!fs.existsSync(configPath)) {
        console.error(chalk.red(`Error: TypeScript config '${configPath}' not found`));
        process.exit(1);
    }

    const { config: rawConfig, error } = ts.readConfigFile(configPath, ts.sys.readFile);
    if (error) {
        console.error("\nTypeScript Configuration Errors:");
        console.error(`- ${error.messageText}`);
        process.exit(1);
    }

    // If this config extends another config, load it recursively
    if (rawConfig.extends) {
        const baseConfigPath = path.resolve(path.dirname(configPath), rawConfig.extends);
        const baseConfig = loadTsConfig(baseConfigPath);
        return { ...baseConfig, ...rawConfig };
    }

    return rawConfig;
}

async function runChecks() {
    printHeader('TypeScript File Check');
    printInfo('Checking file', file);

    // TypeScript checks
    const configPath = path.join(process.cwd(), getTsConfigPath(file));
    printInfo('TypeScript config', configPath);

    // Load the full config with all extends
    const config = loadTsConfig(configPath);

    // Get the directory of the target file
    const fileDir = path.dirname(path.resolve(file));
    const originalBaseUrl = config.compilerOptions?.baseUrl || '.';
    const resolvedBaseUrl = path.resolve(process.cwd(), originalBaseUrl);

    printInfo('Base URL', resolvedBaseUrl);
    printInfo('File directory', fileDir);

    // Create a temporary config that includes only the file we want to check
    const tempConfig = {
        ...config,
        compilerOptions: {
            ...config.compilerOptions,
            noEmit: true,
            skipLibCheck: true,
            isolatedModules: true,
            baseUrl: resolvedBaseUrl,
            paths: {
                ...config.compilerOptions?.paths,
                "*": ["*", path.relative(resolvedBaseUrl, fileDir) + "/*"]
            },
            rootDir: config.compilerOptions?.rootDir || '.'
        },
        files: [file],
        include: undefined,
        exclude: undefined
    };

    // Parse the config content and get compiler options
    const { options, errors, fileNames } = ts.parseJsonConfigFileContent(
        tempConfig,
        ts.sys,
        process.cwd()
    );

    if (errors.length) {
        printHeader('TypeScript Configuration Errors');
        errors.forEach(error => {
            printError(error.messageText);
        });
        process.exit(1);
    }

    // Create program and check the file
    printHeader('Running TypeScript Checks');
    const program = ts.createProgram(fileNames, options);
    const sourceFile = program.getSourceFile(path.resolve(file));
    if (!sourceFile) {
        printError('Could not find source file');
        process.exit(1);
    }

    const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
    let hasTypeScriptErrors = diagnostics.length > 0;
    let hasErrors = false;

    if (hasTypeScriptErrors) {
        printHeader('TypeScript Errors');
        diagnostics.forEach(diagnostic => {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            const location = chalk.gray(`${diagnostic.file.fileName}:${line + 1}:${character + 1}`);
            printError(`${location}\n    ${message}`);
        });
        hasErrors = true;
    }

    // ESLint checks
    printHeader('Running ESLint Checks');
    const eslint = new ESLint();
    const results = await eslint.lintFiles([file]);
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);

    if (resultText) {
        console.log(resultText);
        hasErrors = hasErrors || results.some(result => result.errorCount > 0);
    }

    if (!hasErrors) {
        printSuccess('All checks passed successfully!');
    } else {
        printError('Errors were found in the code. Please fix them and try again.');
    }

    process.exit(hasErrors ? 1 : 0);
}

runChecks().catch(error => {
    printError(`Unexpected error: ${error.message}`);
    process.exit(1);
});
