import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateNested, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '../entities/application.entity';

class InterviewDetailsDto {
  @ApiProperty()
  @IsDateString()
  scheduledAt: Date;

  @ApiProperty()
  @IsNumber()
  duration: number;

  @ApiProperty({ enum: ['online', 'offline', 'phone'] })
  @IsString()
  type: 'online' | 'offline' | 'phone';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  meetingLink?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ default: false })   // ← додати це поле
  @IsOptional()
  reminderSent: boolean = false;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  employerNotes?: string;

  @ApiProperty({ required: false, type: InterviewDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InterviewDetailsDto)
  interviewDetails?: InterviewDetailsDto;
}