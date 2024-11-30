import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { FileSystemType } from '../services/filesystem/types';
import type { FileSystemCredentials } from '../../types/filesystem';

@Entity()
export class FileSystemLocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  path!: string;

  @Column()
  hostId!: string;

  @Column({
    type: 'enum',
    enum: ['sftp', 'smb', 'webdav', 'rclone']
  })
  type!: FileSystemType;

  @Column('jsonb')
  credentials!: FileSystemCredentials;

  @CreateDateColumn()
  created!: Date;

  @UpdateDateColumn()
  modified!: Date;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, string>;
}
