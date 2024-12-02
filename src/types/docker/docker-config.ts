export interface DockerConfig {
  socketPath: string;
  version: string;
  host?: string;
  port?: number;
  tls?: {
    ca?: string;
    cert?: string;
    key?: string;
  };
}

export interface DockerCommandOptions {
  all?: boolean;
  format?: string;
  quiet?: boolean;
  size?: boolean;
  filters?: Record<string, string[]>;
}
