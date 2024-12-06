import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDate } from 'class-validator';
import { IsValidPath } from './base/validators/is-valid-path.validator';
import { IsValidNotes } from './base/validators/is-valid-notes.validator';

export class BookmarkDto {
  @ApiProperty({ description: 'User ID who owns the bookmark' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Host ID where the bookmark is located' })
  @IsString()
  hostId!: string;

  @ApiProperty({ description: 'Path to the bookmarked item' })
  @IsString()
  @IsValidPath()
  path!: string;

  @ApiProperty({ description: 'Optional notes about the bookmark', required: false })
  @IsOptional()
  @IsString()
  @IsValidNotes()
  notes?: string;

  @ApiProperty({ description: 'When the bookmark was last accessed' })
  @IsDate()
  lastAccessed!: Date;

  constructor(partial: Partial<BookmarkDto>) {
    Object.assign(this, partial);
    this.lastAccessed = new Date(this.lastAccessed);
  }
}

export class CreateBookmarkDto {
  @ApiProperty({ description: 'Host ID where the bookmark is located' })
  @IsString()
  hostId!: string;

  @ApiProperty({ description: 'Path to the bookmarked item' })
  @IsString()
  @IsValidPath()
  path!: string;

  @ApiProperty({ description: 'Optional notes about the bookmark', required: false })
  @IsOptional()
  @IsString()
  @IsValidNotes()
  notes?: string;
}

export class UpdateBookmarkDto {
  @ApiProperty({ description: 'Optional notes about the bookmark', required: false })
  @IsOptional()
  @IsString()
  @IsValidNotes()
  notes?: string;

  @ApiProperty({ description: 'When the bookmark was last accessed', required: false })
  @IsOptional()
  @IsDate()
  lastAccessed?: Date;
}
