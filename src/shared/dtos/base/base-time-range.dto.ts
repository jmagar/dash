import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsEnum, Validate } from 'class-validator';
import { IsValidTimezone } from './validators/is-valid-timezone.validator';
import { IsStartDateBeforeEndDate } from './validators/is-start-date-before-end-date.validator';

export enum TimeGranularity {
    MINUTE = 'minute',
    HOUR = 'hour',
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    QUARTER = 'quarter',
    YEAR = 'year'
}

export class BaseTimeRangeDto {
    @ApiProperty({ description: 'Start date of the time range' })
    @Type(() => Date)
    @IsDate()
    @IsStartDateBeforeEndDate()
    startDate: Date = new Date();

    @ApiProperty({ description: 'End date of the time range' })
    @Type(() => Date)
    @IsDate()
    endDate: Date = new Date();

    @ApiProperty({ description: 'Timezone for the time range (IANA timezone format)', required: false })
    @IsString()
    @IsOptional()
    @Validate(IsValidTimezone)
    timezone?: string;

    @ApiProperty({ description: 'Time range granularity', required: false, enum: TimeGranularity })
    @IsEnum(TimeGranularity)
    @IsOptional()
    granularity?: TimeGranularity;

    constructor(partial: Partial<BaseTimeRangeDto>) {
        // Set default end date to 1 day after start date
        const defaultStart = new Date();
        const defaultEnd = new Date(defaultStart);
        defaultEnd.setDate(defaultEnd.getDate() + 1);
        
        this.startDate = defaultStart;
        this.endDate = defaultEnd;
        
        Object.assign(this, partial);
        
        // Convert string dates to Date objects
        if (partial.startDate && !(partial.startDate instanceof Date)) {
            this.startDate = new Date(partial.startDate);
        }
        if (partial.endDate && !(partial.endDate instanceof Date)) {
            this.endDate = new Date(partial.endDate);
        }
    }
}
