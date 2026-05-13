import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsArray, IsBoolean, IsEnum, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { JobType, ExperienceLevel, WorkFormat } from '../entities/job.entity';

export class SearchJobsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, enum: JobType, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(JobType, { each: true })
  jobType?: JobType[];

  @ApiProperty({ required: false, enum: ExperienceLevel, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(ExperienceLevel, { each: true })
  experienceLevel?: ExperienceLevel[];

  @ApiProperty({ required: false, enum: WorkFormat, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(WorkFormat, { each: true })
  workFormat?: WorkFormat[];

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMax?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillIds?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  language?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiProperty({ required: false, enum: ['createdAt', 'salary'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiProperty({ required: false, description: 'Фільтр по оплачуваних стажуваннях' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isPaid?: boolean;
}