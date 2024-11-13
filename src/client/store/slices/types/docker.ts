import type { Container as BaseContainer } from '../../../../types/models-shared';

export type ContainerState =
  | 'running'
  | 'stopped'
  | 'paused'
  | 'starting'
  | 'stopping'
  | 'error';

export interface Container extends Omit<BaseContainer, 'state'> {
  state: ContainerState;
}

export interface DockerState {
  containers: Record<string, Container>;
  loading: boolean;
  error: string | null;
  selectedContainerId: string | null;
}

export interface ContainerUpdate {
  containerId: string;
  updates: Partial<Container>;
}
