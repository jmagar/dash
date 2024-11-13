import { ParamsDictionary } from 'express-serve-static-core';

import type { Host, SSHConfig, ApiResponse } from '../../../types/models-shared';

export type { Host, SSHConfig };

export type HostResponse = ApiResponse<Host | Host[]>

export interface RequestParams extends ParamsDictionary {
  id: string;
}

export interface CreateHostRequest {
  name: string;
  hostname: string;
  port: number;
  username?: string;
  password?: string;
  sshKeyId?: string;
}

export interface UpdateHostRequest extends CreateHostRequest {
  isActive?: boolean;
}

export type DeleteHostResponse = ApiResponse<void>
