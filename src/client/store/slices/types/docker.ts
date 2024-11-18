import type { DockerContainer } from '@/types/docker';

export type ContainerState =
  | 'created'
  | 'running'
  | 'paused'
  | 'restarting'
  | 'removing'
  | 'exited'
  | 'dead'
  | 'starting'
  | 'stopping'
  | 'error';

export interface DockerState {
  containers: DockerContainer[];
  loading: boolean;
  error: string | null;
  selectedContainerId: string | null;
}

export interface ContainerUpdate {
  containerId: string;
  updates: Partial<DockerContainer>;
}
