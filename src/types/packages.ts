import { ParamsDictionary } from 'express-serve-static-core';

export interface Package {
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  updateAvailable?: boolean;
}

export interface PackageUpdate {
  name: string;
  version: string;
}

export interface CommandResult {
  code: number;
  output: string;
}

export interface PackageResponse {
  success: boolean;
  packages?: Package[];
  message?: string;
  data?: Package[] | { output: string } | PackageUpdate[];
  error?: string;
}

export interface PackageRequest {
  packageName: string;
}

export interface RequestParams extends ParamsDictionary {
  hostId: string;
}

export interface HostConnection {
  id: string;
  hostname: string;
  port: number;
  username: string;
  private_key?: string;
  passphrase?: string;
}
