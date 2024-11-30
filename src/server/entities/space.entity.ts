import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { SpaceItem } from '../../types/filesystem';

@Entity()
export class Space {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column('simple-array')
  locationIds!: string[];

  @Column('jsonb', { nullable: true })
  items?: SpaceItem[];

  @CreateDateColumn()
  created!: Date;

  @UpdateDateColumn()
  modified!: Date;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, string>;
}
