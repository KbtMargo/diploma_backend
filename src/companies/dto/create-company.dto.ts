// backend/src/companies/dto/create-company.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CompanySize } from '../entities/company.entity';

class LocationDto {
  @ApiProperty()
  country: string;

  @ApiProperty()
  city: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty()
  isHeadquarters: boolean;
}

class SocialLinksDto {
  @ApiProperty({ required: false })
  linkedin?: string;

  @ApiProperty({ required: false })
  facebook?: string;

  @ApiProperty({ required: false })
  twitter?: string;

  @ApiProperty({ required: false })
  instagram?: string;
}

export class CreateCompanyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  foundedYear?: number;

  @ApiProperty({ enum: CompanySize, required: false })
  @IsOptional()
  @IsString()
  size?: CompanySize;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  specialties?: string[];

  @ApiProperty({ required: false, type: SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @ApiProperty({ required: false, type: [LocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  locations?: LocationDto[];
}