export enum ShareAccessType {
  PUBLIC = 'public',
  PASSWORD = 'password',
  PRIVATE = 'private'
}

export enum SharePermission {
  READ = 'read',
  WRITE = 'write',
  FULL = 'full'
}

export interface ShareConfig {
  path: string;
  accessType: ShareAccessType;
  permission: SharePermission;
  password?: string;
  expiresAt?: Date | null;
  maxAccesses?: number;
  _csrf?: string;
}

export interface ShareInfoDto {
  id: string;
  url: string;
  accessType: ShareAccessType;
  permission: SharePermission;
  expiresAt?: Date;
  maxAccesses?: number;
  currentAccesses: number;
  createdAt: Date;
  updatedAt: Date;
} 