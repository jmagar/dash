import { ParamsDictionary } from 'express-serve-static-core';

export interface Host {
    id: string;
    name: string;
    hostname: string;
    port: number;
    username?: string;
    password?: string;
    ssh_key_id?: string;
    is_active?: boolean;
    private_key?: string;
    passphrase?: string;
}

export interface HostResponse {
  success: boolean;
  data?: Host | Host[];
  error?: string;
}

export interface RequestParams extends ParamsDictionary {
  id: string;
}

export interface SSHConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  readyTimeout?: number;
  keepaliveInterval?: number;
  keepaliveCountMax?: number;
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

export interface DeleteHostResponse {
  success: boolean;
  error?: string;
}
