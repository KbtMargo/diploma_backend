import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateCompanyDto } from './dto/create-company.dto';   // ← додати
import { UpdateCompanyDto } from './dto/update-company.dto';   // ← додати
import { CreateReviewDto } from './dto/create-review.dto'; 
@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create company profile' })
  create(@Body() createCompanyDto: CreateCompanyDto, @Request() req) {
    return this.companiesService.create(createCompanyDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10, @Query() filters: any) {
    return this.companiesService.findAll(page, limit, filters);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my company' })
  getMyCompany(@Request() req) {
    return this.companiesService.findByOwner(req.user.userId);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get companies statistics' })
  getStatistics(@Query('companyId') companyId?: string) {
    return this.companiesService.getStatistics(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get company reviews' })
  getReviews(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.companiesService.getReviews(id, page, limit);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto, @Request() req) {
    return this.companiesService.update(id, updateCompanyDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete company' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.companiesService.delete(id, req.user.userId, req.user.role);
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add company review' })
  addReview(@Param('id') id: string, @Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.companiesService.addReview(id, createReviewDto, req.user.userId);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify company (admin only)' })
  verifyCompany(@Param('id') id: string, @Request() req) {
    return this.companiesService.verifyCompany(id, req.user.userId);
  }
}