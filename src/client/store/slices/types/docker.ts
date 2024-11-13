import type { Container as DockerContainer } from '../../../../types';

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

export interface Container extends Omit<DockerContainer, 'state'> {
  state: ContainerState;
}

export interface ContainerUpdate {
  containerId: string;
  updates: Partial<Container>;
}

export interface DockerState {
  containers: Record<string, Container>;
  loading: boolean;
  error: string | null;
  selectedContainerId: string | null;
}
