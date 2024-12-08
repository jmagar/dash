import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { ESLint } from 'eslint';
import minimist from 'minimist';
import ora from 'ora';
import { MultiBar } from 'cli-progress';
import type { SingleBar } from 'cli-progress';
import workerpool from 'workerpool';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import for chalk (ESM module)
let chalk: any;
const chalkPromise = import('chalk').then(m => m.default);

interface FileStats {
    path: string;
    errors: number;
    warnings: number;
    messages: Array<{
        type: 'error' | 'warning';
        message: string;
        line?: number;
        column?: number;
        rule?: string;
    }>;
}

interface CacheEntry {
    hash: string;
    stats: FileStats;
    timestamp: number;
}

interface CheckOptions {
    format?: 'text' | 'json' | 'html';
    minSeverity?: 'error' | 'warning';
    ignore?: string[];
    include?: string[];
    tsconfig?: string;
    cache?: boolean;
    workers?: number;
}

type ChalkColor = 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';

// Helper function to shorten file paths for display
function shortenPath(filePath: string): string {
    const parts = filePath.split(path.sep);
    if (parts.length <= 3) return filePath;
    return path.join('...', parts.slice(-3).join(path.sep));
}

// Helper functions for console output
async function printHeader(text: string, color: ChalkColor = 'blue'): Promise<void> {
    if (!chalk) chalk = await chalkPromise;
    const line = '─'.repeat(text.length + 4);
    console.log('\n' + chalk[color](line));
    console.log(chalk[color]('│ ') + chalk[color].bold(text) + chalk[color](' │'));
    console.log(chalk[color](line) + '\n');
}

async function printError(text: string, type: 'error' | 'warning' = 'error'): Promise<void> {
    if (!chalk) chalk = await chalkPromise;
    const icon = type === 'error' ? '✗' : '⚠';
    const color = type === 'error' ? 'red' : 'yellow';
    console.log(chalk[color](icon + ' ') + text);
}

async function printSuccess(text: string): Promise<void> {
    if (!chalk) chalk = await chalkPromise;
    console.log(chalk.green('✓ ') + text);
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds % 60}s`;
}

function shouldIncludeMessage(msg: FileStats['messages'][0], options: CheckOptions): boolean {
    if (options.minSeverity === 'error' && msg.type !== 'error') return false;
    if (options.ignore?.includes(msg.rule || '')) return false;
    return true;
}

function generateHtmlReport(fileStats: FileStats[]): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>TypeScript Check Report</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; }
                .error { color: #dc3545; }
                .warning { color: #ffc107; }
                .success { color: #28a745; }
                .file { margin-bottom: 20px; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; }
                .message { margin: 5px 0; padding: 5px; }
                .summary { margin: 20px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
            </style>
        </head>
        <body>
            <h1>TypeScript Check Report</h1>
            <div class="summary">
                <h2>Summary</h2>
                <p>Files checked: ${fileStats.length}</p>
                <p>Total errors: ${fileStats.reduce((sum, stat) => sum + stat.errors, 0)}</p>
                <p>Total warnings: ${fileStats.reduce((sum, stat) => sum + stat.warnings, 0)}</p>
            </div>
            ${fileStats.map(stat => `
                <div class="file">
                    <h3>${stat.path}</h3>
                    ${stat.messages.map(msg => `
                        <div class="message ${msg.type}">
                            ${msg.type === 'error' ? '❌' : '⚠️'} 
                            ${msg.line ? `Line ${msg.line}${msg.column ? `:${msg.column}` : ''} - ` : ''}
                            ${msg.message}
                            ${msg.rule ? `(${msg.rule})` : ''}
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </body>
        </html>
    `;
}

async function printFileStats(stats: FileStats, options: CheckOptions): Promise<void> {
    const filteredMessages = stats.messages.filter(msg => shouldIncludeMessage(msg, options));

    if (filteredMessages.length === 0) {
        return;
    }

    // Group messages by type and rule
    const groupedMessages = filteredMessages.reduce<Record<string, Array<typeof filteredMessages[number]>>>((acc, msg) => {
        const key = `${msg.type}-${msg.rule ?? 'unknown'}`;
        (acc[key] ??= []).push(msg);
        return acc;
    }, {});

    // Print grouped messages
    for (const [key, messages] of Object.entries(groupedMessages)) {
        const [type, rule] = key.split('-');
        const icon = type === 'error' ? '✗' : '⚠';
        const color = type === 'error' ? 'red' : 'yellow';
        
        await printHeader(`${messages.length} ${type}${messages.length > 1 ? 's' : ''} ${rule !== 'unknown' ? `(${rule})` : ''}`, color as ChalkColor);
        
        for (const msg of messages) {
            const location = msg.line !== undefined ? ` (${msg.line}:${msg.column ?? 0})` : '';
            await printError(`${stats.path}${location} - ${msg.message}`, type as 'error' | 'warning');
        }
    }
}

// Cache management
class FileCache {
    private cachePath: string;
    private cache: Map<string, CacheEntry>;

    constructor() {
        this.cachePath = path.join(process.cwd(), '.ts-check-cache');
        this.cache = new Map();
        this.loadCache();
    }

    private loadCache(): void {
        try {
            if (fs.existsSync(this.cachePath)) {
                const data = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
                this.cache = new Map(Object.entries(data));
            }
        } catch (error) {
            console.warn('Failed to load cache:', error);
            this.cache = new Map();
        }
    }

    public saveCache(): void {
        try {
            const data = Object.fromEntries(this.cache);
            fs.writeFileSync(this.cachePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.warn('Failed to save cache:', error);
        }
    }

    public getFileHash(filePath: string): string {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    }

    public getCachedStats(filePath: string): FileStats | null {
        const entry = this.cache.get(filePath);
        if (!entry) return null;

        const currentHash = this.getFileHash(filePath);
        if (entry.hash !== currentHash) return null;

        // Cache expires after 24 hours
        if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null;

        return entry.stats;
    }

    public setCachedStats(filePath: string, stats: FileStats): void {
        this.cache.set(filePath, {
            hash: this.getFileHash(filePath),
            stats,
            timestamp: Date.now()
        });
    }
}

// Worker function for parallel processing
async function checkFile(filePath: string, options: CheckOptions): Promise<FileStats> {
    const eslint = new ESLint();
    const program = ts.createProgram([filePath], {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        ...options.tsconfig ? { configFile: options.tsconfig } : {}
    });

    const diagnostics = ts.getPreEmitDiagnostics(program);
    const eslintResults = await eslint.lintFiles([filePath]);

    const stats: FileStats = {
        path: filePath,
        errors: 0,
        warnings: 0,
        messages: []
    };

    // Process TypeScript diagnostics
    diagnostics.forEach(diagnostic => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        const type = diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning';
        
        if (type === 'error') stats.errors++;
        else stats.warnings++;

        if (diagnostic.file && diagnostic.start !== undefined) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            stats.messages.push({
                type,
                message,
                line,
                column: character
            });
        } else {
            stats.messages.push({
                type,
                message
            });
        }
    });

    // Process ESLint results
    eslintResults.forEach(result => {
        result.messages.forEach(msg => {
            const type = msg.severity === 2 ? 'error' : 'warning';
            
            if (type === 'error') stats.errors++;
            else stats.warnings++;

            stats.messages.push({
                type,
                message: msg.message,
                line: msg.line,
                column: msg.column,
                rule: msg.ruleId || undefined
            });
        });
    });

    return stats;
}

async function checkDirectory(directory: string, options: CheckOptions = {}): Promise<void> {
    if (!chalk) chalk = await chalkPromise;
    const startTime = Date.now();
    const cache = options.cache ? new FileCache() : null;
    const files = getTypeScriptFiles(directory);
    
    const multibar = new MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: ' {bar} | {percentage}% | {value}/{total} files | {filename}'
    });

    const progressBar = multibar.create(files.length, 0, { filename: '' });
    const numWorkers = options.workers ?? Math.max(1, Math.min(4, workerpool.cpus - 1));
    const pool = workerpool.pool(__filename, { maxWorkers: numWorkers });

    try {
        const tasks = files.map(async (file) => {
            const shortPath = shortenPath(file);
            progressBar.update({ filename: shortPath });

            let stats: FileStats;
            if (cache?.getCachedStats(file)) {
                stats = cache.getCachedStats(file)!;
                progressBar.increment();
            } else {
                stats = await pool.exec('checkFile', [file, options]);
                cache?.setCachedStats(file, stats);
                progressBar.increment();
            }

            return stats;
        });

        const results = await Promise.all(tasks);
        multibar.stop();

        // Print results
        const fileStats = results.filter(stats => 
            stats.errors > 0 || (options.minSeverity === 'warning' && stats.warnings > 0)
        );

        if (fileStats.length > 0) {
            for (const stats of fileStats) {
                await printFileStats(stats, options);
            }
        } else {
            await printSuccess('No issues found!');
        }

        // Print summary
        const totalErrors = results.reduce((sum, stats) => sum + stats.errors, 0);
        const totalWarnings = results.reduce((sum, stats) => sum + stats.warnings, 0);
        const duration = Date.now() - startTime;

        await printHeader('Summary', totalErrors > 0 ? 'red' : totalWarnings > 0 ? 'yellow' : 'green');
        console.log(chalk.white(`Files checked: ${chalk.bold(files.length)}`));
        console.log(chalk.red(`Total errors: ${chalk.bold(totalErrors)}`));
        console.log(chalk.yellow(`Total warnings: ${chalk.bold(totalWarnings)}`));
        console.log(chalk.blue(`Time taken: ${chalk.bold(formatDuration(duration))}`));

    } finally {
        pool.terminate();
        cache?.saveCache();
    }
}

// Get all TypeScript files in directory recursively
function getTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...getTypeScriptFiles(fullPath));
        } else if (stat.isFile() && /\.tsx?$/.test(item)) {
            files.push(fullPath);
        }
    }

    return files;
}

// If this file is being run directly as a worker
if (workerpool.isMainThread) {
    const argv = minimist(process.argv.slice(2));
    const directory = argv._[0];

    if (!directory) {
        console.error('Please provide a directory to check');
        process.exit(1);
    }

    const options: CheckOptions = {
        format: argv.format as 'text' | 'json' | 'html',
        minSeverity: argv.minSeverity as 'error' | 'warning',
        ignore: argv.ignore?.split(','),
        include: argv.include?.split(','),
        tsconfig: argv.tsconfig,
        cache: argv.cache !== false,
        workers: argv.workers ? parseInt(argv.workers, 10) : undefined
    };

    checkDirectory(directory, options).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
} else {
    // Export the checkFile function for worker threads
    workerpool.worker({
        checkFile
    });
}
