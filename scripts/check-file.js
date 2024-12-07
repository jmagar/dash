const file = process.argv[2];
if (!file) {
    console.error('Please provide a file path');
    process.exit(1);
}

const ts = require('typescript');
const path = require('path');
const fs = require('fs');
const { ESLint } = require('eslint');

// Get the appropriate tsconfig based on file path
function getTsConfigPath(filePath) {
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('src/types/')) {
        return 'tsconfig.json';
    } else if (normalizedPath.includes('src/server/')) {
        return 'tsconfig.server.json';
    } else if (normalizedPath.includes('src/client/')) {
        return 'tsconfig.client.json';
    }
    return 'tsconfig.json'; // Default to root tsconfig
}

// Load and parse tsconfig with all its extended configs
function loadTsConfig(configPath) {
    const { config: rawConfig, error } = ts.readConfigFile(configPath, ts.sys.readFile);
    if (error) {
        console.error(ts.formatDiagnostic(error, {
            getCurrentDirectory: () => process.cwd(),
            getCanonicalFileName: fileName => fileName,
            getNewLine: () => ts.sys.newLine
        }));
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
    let hasErrors = false;

    // TypeScript checks
    const configPath = path.join(process.cwd(), getTsConfigPath(file));
    if (!fs.existsSync(configPath)) {
        console.error(`Could not find ${configPath}`);
        process.exit(1);
    }

    // Load the full config with all extends
    const config = loadTsConfig(configPath);

    // Get the directory of the target file
    const fileDir = path.dirname(path.resolve(file));

    // Parse the config content and get compiler options
    const { options, errors } = ts.parseJsonConfigFileContent(
        {
            ...config,
            include: [file],  // Only include the target file
            exclude: []       // Don't exclude anything for this check
        },
        ts.sys,
        fileDir,
        undefined,
        configPath
    );

    if (errors.length) {
        console.error(ts.formatDiagnostics(errors, {
            getCurrentDirectory: () => process.cwd(),
            getCanonicalFileName: fileName => fileName,
            getNewLine: () => ts.sys.newLine
        }));
        process.exit(1);
    }

    // Add necessary compiler options
    const compilerOptions = {
        ...options,
        noEmit: true,
        skipLibCheck: true,
        composite: false,
        declaration: false,
        incremental: false,
        isolatedModules: true // This helps limit errors to just this file
    };

    // Create program and only check the specified file
    const program = ts.createProgram([path.resolve(file)], compilerOptions);
    const sourceFile = program.getSourceFile(path.resolve(file));
    if (!sourceFile) {
        console.error('Could not find source file');
        process.exit(1);
    }

    const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
    let hasTypeScriptErrors = diagnostics.length > 0;

    if (hasTypeScriptErrors) {
        console.error("\nTypeScript errors:");
        console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
            getCurrentDirectory: () => process.cwd(),
            getCanonicalFileName: fileName => fileName,
            getNewLine: () => ts.sys.newLine
        }));
        hasErrors = true;
    }

    // ESLint checks
    let hasEslintErrors = false;
    console.log("\nESLint results:");
    try {
        const eslint = new ESLint({
            useEslintrc: true,
            overrideConfig: {
                env: { node: true }
            }
        });
        
        const results = await eslint.lintFiles([file]);
        const formatter = await eslint.loadFormatter('stylish');
        const resultText = formatter.format(results);
        
        if (resultText) {
            console.log(resultText);
            if (results.some(result => result.errorCount > 0 || result.warningCount > 0)) {
                hasErrors = true;
                hasEslintErrors = true;
            }
        }
    } catch (error) {
        console.error('ESLint error:', error);
        hasErrors = true;
        hasEslintErrors = true;
    }

    if (!hasTypeScriptErrors && !hasEslintErrors) {
        console.log('\n✨ No TypeScript or ESLint errors found! ✨');
    }

    process.exit(hasErrors ? 1 : 0);
}

runChecks().catch(error => {
    console.error('Error running checks:', error);
    process.exit(1);
});
