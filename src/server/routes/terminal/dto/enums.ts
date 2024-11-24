export enum ConnectionStatus {
    Connected = 'connected',
    Disconnected = 'disconnected',
    Error = 'error'
}

export enum CommandStatus {
    Pending = 'pending',
    Running = 'running',
    Completed = 'completed',
    Failed = 'failed'
}

export enum TerminalEventType {
    Data = 'data',
    Resize = 'resize',
    Exit = 'exit',
    Error = 'error'
}

export type TerminalEventPayload =
    | { data: string }
    | { cols: number; rows: number }
    | { code: number }
    | { message: string };
