import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { JobType, ExperienceLevel, WorkFormat } from '../entities/job.entity';

export class CreateJobDto {
  @ApiProperty({ example: 'Senior Full Stack Developer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'We are looking for an experienced developer...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  requirements?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  responsibilities?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  benefits?: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ enum: ExperienceLevel, required: false })
  @IsEnum(ExperienceLevel)
  @IsOptional()
  experienceLevel?: ExperienceLevel;

  @ApiProperty({ enum: WorkFormat })
  @IsEnum(WorkFormat)
  workFormat: WorkFormat;

  @ApiProperty({ example: 'Ukraine' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'Kyiv' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false, example: 2000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  salaryMin?: number;

  @ApiProperty({ required: false, example: 4000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  salaryMax?: number;

  @ApiProperty({ required: false, example: 'USD' })
  @IsString()
  @IsOptional()
  salaryCurrency?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isSalaryNegotiable?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isRemote?: boolean;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  applicationDeadline?: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  educationLevel?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  requiredLanguages?: string[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  vacanciesCount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  skillIds?: string[];

  @ApiProperty({ required: false })
@IsBoolean()
@IsOptional()
isFeatured?: boolean;

@ApiProperty({ required: false })
@IsBoolean()
@IsOptional()
isUrgent?: boolean;

  @ApiProperty({ required: false, description: 'Чи оплачується стажування' })
  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @ApiProperty({ required: false, description: 'Розмір стипендії/стажувальної виплати' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  stipendAmount?: number;
}