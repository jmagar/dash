import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
export enum ServiceStatus {
    OPERATIONAL = 'OPERATIONAL',
    DEGRADED = 'DEGRADED',
    MAINTENANCE = 'MAINTENANCE',
    OUTAGE = 'OUTAGE',
    UNKNOWN = 'UNKNOWN'
}
export class BaseStatusDto {
    @ApiProperty({ description: 'Current service status', enum: ServiceStatus })
    @IsEnum(ServiceStatus)
    status: ServiceStatus;
    @ApiProperty({ description: 'Status message or description' })
    @IsString()
    message: string;
    @ApiProperty({ description: 'Component or service name' })
    @IsString()
    component: string;
    @ApiProperty({ description: 'Status code', required: false })
    @IsNumber()
    @IsOptional()
    code?: number;
    @ApiProperty({ description: 'Last status update timestamp' })
    @IsString()
    updatedAt: string = new Date().toISOString();
    @ApiProperty({ description: 'Additional status details', required: false })
    @IsString()
    @IsOptional()
    details?: string;
    constructor(partial: Partial<BaseStatusDto>) {
        this.status = ServiceStatus.UNKNOWN;
        this.message = '';
        this.component = '';
        Object.assign(this, partial);
    }
}
