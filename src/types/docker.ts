export interface DockerPort {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: string;
}

export interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  Status: string;
  State: string;
  Created: number;
  Ports: DockerPort[];
  Labels: Record<string, string>;
}

export interface FormattedContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: number;
  ports: string[];
}

export interface DockerStack {
  name: string;
  services: number;
  status: 'running' | 'partial';
  created: number;
}

export interface DockerResponse {
  success?: boolean;
  error?: string;
}

export interface DockerStats {
  // Add specific stats properties as needed
  [key: string]: unknown;
}
