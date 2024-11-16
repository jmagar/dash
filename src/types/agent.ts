import type { Host } from './models-shared';

export interface AgentConfig {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    useSyslog: boolean;
    metrics: {
        collectionInterval: number; // in milliseconds
        retentionPeriod: number;   // in hours
        includeIO: boolean;
        includeNetwork: boolean;
        includeExtended: boolean;
    };
}

export interface AgentStatus {
    connected: boolean;
    version: string;
    lastSeen: Date;
    metrics: {
        cpu: number;
        memory: number;
        uptime: number;
    };
}

export interface AgentCommand {
    id: string;
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
}

export interface AgentCommandResult {
    id: string;
    status: 'completed' | 'failed' | 'timeout';
    exitCode: number;
    stdout: string;
    stderr: string;
    startedAt: Date;
    completedAt: Date;
}

export interface AgentClient {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    executeCommand(command: AgentCommand): Promise<AgentCommandResult>;
    getStatus(): Promise<AgentStatus>;
    updateConfig(config: Partial<AgentConfig>): Promise<void>;
}
