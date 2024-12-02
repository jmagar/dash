import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ShareAccessType, ShareStatus } from '../dto/sharing.dto';

@Entity('file_share')
export class FileShare {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    path!: string;

    @Column({
        type: 'enum',
        enum: ShareAccessType,
        default: ShareAccessType.PUBLIC
    })
    accessType!: ShareAccessType;

    @Column({
        type: 'enum',
        enum: ShareStatus,
        default: ShareStatus.ACTIVE
    })
    status!: ShareStatus;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ nullable: true })
    expiresAt?: Date;

    @Column({ default: 0 })
    accessCount!: number;

    @Column({ nullable: true })
    maxAccesses?: number;

    @Column({ nullable: true })
    passwordHash?: string;

    @Column({ default: false })
    allowZipDownload!: boolean;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, unknown>;

    @Column({ type: 'jsonb', nullable: true })
    security?: {
        rateLimit?: {
            maxRequests: number;
            windowMinutes: number;
        };
        ipAllowlist?: string[];
        ipDenylist?: string[];
        referrerAllowlist?: string[];
        referrerDenylist?: string[];
        csrfProtection?: boolean;
    };

    @Column({ nullable: true })
    csrfToken?: string;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ nullable: true, type: 'timestamp' })
    lastAccessedAt?: Date;

    @Column({ type: 'jsonb', nullable: true })
    accessLog?: {
        timestamp: Date;
        ipAddress: string;
        userAgent: string;
        status: string;
        error?: string;
        headers?: Record<string, string>;
        rateLimit?: {
            remaining: number;
            reset: Date;
        };
    }[];
}
