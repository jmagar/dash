import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ShareAccessType, ShareStatus } from '../dto/sharing.dto';

@Entity('file_shares')
export class FileShare {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    path: string;

    @Column({
        type: 'enum',
        enum: ShareAccessType,
        default: ShareAccessType.READ
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
    expiresAt: Date | null;

    @Column({ default: 0 })
    accessCount: number;

    @Column({ nullable: true })
    maxAccesses: number | null;

    @Column({ nullable: true })
    passwordHash: string | null;

    @Column({ default: false })
    allowZipDownload: boolean;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, unknown> | null;

    @Column({ type: 'jsonb', nullable: true })
    security: {
        rateLimit?: {
            maxRequests: number;
            windowMinutes: number;
        };
        allowedIps?: string[];
        allowedReferrers?: string[];
        csrfProtection?: boolean;
    } | null;

    @Column({ nullable: true })
    csrfToken: string | null;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true, type: 'timestamp' })
    lastAccessedAt: Date | null;

    @Column({ type: 'jsonb', nullable: true })
    accessLog: {
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
    }[] | null;
}
