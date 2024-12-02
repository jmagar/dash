export interface DockerContainerCreateOptions {
  image: string;
  name?: string;
  env?: Record<string, string>;
  ports?: Record<string, string>;
  volumes?: Record<string, string>;
  command?: string[];
}

export interface DockerInfo {
  id: string;
  version: string;
  apiVersion: string;
  platform: {
    name: string;
    architecture: string;
    os: string;
  };
}

export interface DockerCommandResult {
  success: boolean;
  output: string;
  error?: string;
}
