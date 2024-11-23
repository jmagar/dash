import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ShareAccessType, ShareStatus } from '../dto/sharing.dto';

@Entity('file_shares')
export class FileShare {
    @PrimaryColumn()
    id: string;

    @Column()
    path: string;

    @Column({
        type: 'enum',
        enum: ShareAccessType
    })
    accessType: ShareAccessType;

    @Column({
        type: 'enum',
        enum: ShareStatus,
        default: ShareStatus.ACTIVE
    })
    status: ShareStatus;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ nullable: true })
    expiresAt?: Date;

    @Column({ default: 0 })
    accessCount: number;

    @Column({ nullable: true })
    maxAccesses?: number;

    @Column({ nullable: true })
    passwordHash?: string;

    @Column({ default: false })
    allowZipDownload: boolean;

    @Column({ nullable: true, type: 'timestamp' })
    lastAccessedAt?: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, unknown>;

    @UpdateDateColumn()
    updatedAt: Date;
}
