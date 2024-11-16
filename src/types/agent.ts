import type { Host } from './models-shared';

export interface AgentConfig {
    id: string;
    server: {
        url: string;
        token: string;
    };
    features: {
        docker: boolean;
        kubernetes: boolean;
        monitoring: boolean;
        backup: boolean;
        security: boolean;
    };
    monitoring: {
        interval: number;
        retention: number;
        metrics: {
            system: boolean;
            docker: boolean;
            kubernetes: boolean;
        };
    };
    backup: {
        interval: number;
        retention: number;
        paths: string[];
    };
    security: {
        interval: number;
        rules: string[];
    };
    logging: {
        level: string;
        file: string;
    };
    labels: Record<string, string>;
}

export interface AgentInfo {
    id: string;
    version: string;
    hostname: string;
    platform: string;
    arch: string;
    status: 'running' | 'stopped' | 'error';
    features: {
        docker: boolean;
        kubernetes: boolean;
        monitoring: boolean;
        backup: boolean;
        security: boolean;
    };
    labels: Record<string, string>;
    startedAt: Date;
    lastSeen: Date;
}

export interface HeartbeatInfo {
    id: string;
    timestamp: Date;
    uptime: number;
    load: [number, number, number];
    memory: {
        total: number;
        used: number;
        free: number;
    };
    disk: {
        total: number;
        used: number;
        free: number;
    };
    network: {
        interfaces: string[];
        connections: number;
    };
    docker: {
        running: number;
        total: number;
        version: string;
    };
    processes: {
        total: number;
        running: number;
        blocked: number;
    };
    errors: Array<{
        code: string;
        message: string;
        timestamp: Date;
    }>;
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
