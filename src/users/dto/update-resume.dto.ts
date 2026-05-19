import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional, IsArray, ValidateNested,
  IsString, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class EducationDto {
  @ApiProperty() @IsString()
  institution: string;

  @ApiProperty() @IsString()
  degree: string;

  @ApiProperty() @IsString()
  field: string;

  @ApiProperty() @IsString()
  startDate: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  endDate?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsBoolean()
  current?: boolean;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  grade?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  description?: string;
}

class WorkExperienceDto {
  @ApiProperty() @IsString()
  company: string;

  @ApiProperty() @IsString()
  position: string;

  @ApiProperty() @IsString()
  startDate: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  endDate?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsBoolean()
  current?: boolean;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  achievements?: string[];
}

class PortfolioDto {
  @ApiProperty() @IsString()
  title: string;

  @ApiProperty() @IsString()
  description: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  url?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  fileUrl?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  fileType?: string;
}

export class UpdateResumeDto {
  @ApiProperty({ required: false, type: [EducationDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiProperty({ required: false, type: [WorkExperienceDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => WorkExperienceDto)
  workExperience?: WorkExperienceDto[];

  @ApiProperty({ required: false, type: [PortfolioDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PortfolioDto)
  portfolio?: PortfolioDto[];
}
