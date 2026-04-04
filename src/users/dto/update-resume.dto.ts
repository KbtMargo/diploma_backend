import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class EducationDto {
  @ApiProperty()
  institution: string;

  @ApiProperty()
  degree: string;

  @ApiProperty()
  field: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ required: false })
  grade?: string;

  @ApiProperty({ required: false })
  description?: string;
}

class WorkExperienceDto {
  @ApiProperty()
  company: string;

  @ApiProperty()
  position: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty()
  current: boolean;

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false, type: [String] })
  achievements?: string[];
}

class PortfolioDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty({ required: false })
  fileUrl?: string;

  @ApiProperty({ required: false })
  fileType?: string;
}

export class UpdateResumeDto {
  @ApiProperty({ required: false, type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiProperty({ required: false, type: [WorkExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  workExperience?: WorkExperienceDto[];

  @ApiProperty({ required: false, type: [PortfolioDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioDto)
  portfolio?: PortfolioDto[];
}