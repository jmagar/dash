import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('share_access_logs')
export class ShareAccessLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    shareId: string;

    @Column({ type: 'timestamp' })
    timestamp: Date;

    @Column()
    ipAddress: string;

    @Column()
    userAgent: string;

    @Column({ nullable: true })
    status?: string;

    @Column({ nullable: true })
    error?: string;

    @CreateDateColumn()
    createdAt: Date;
}
