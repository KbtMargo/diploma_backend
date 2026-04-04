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
import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from './entities/application.entity';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/entities/user.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@ApiTags('applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Apply for a job' })
  create(@Body() createApplicationDto: CreateApplicationDto, @Request() req) {
    return this.applicationsService.create(createApplicationDto, req.user.userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my applications' })
  getMyApplications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: ApplicationStatus,
  ) {
    return this.applicationsService.findAllForApplicant(req.user.userId, page, limit, status);
  }

  @Get('employer')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get applications for employer' })
  getEmployerApplications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('jobId') jobId?: string,
    @Query('status') status?: ApplicationStatus,
  ) {
    return this.applicationsService.findAllForEmployer(req.user.userId, page, limit, jobId, status);
  }

  @Get('statistics')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get applications statistics' })
  getStatistics(@Request() req) {
    return this.applicationsService.getStatistics(
      req.user.role === UserRole.ADMIN ? undefined : req.user.userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.applicationsService.findOne(id, req.user.userId, req.user.role);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update application status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
    @Request() req,
  ) {
    return this.applicationsService.updateStatus(id, updateStatusDto, req.user.userId, req.user.role);
  }

  @Put(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw application' })
  withdraw(@Param('id') id: string, @Request() req) {
    return this.applicationsService.withdraw(id, req.user.userId);
  }

  @Post(':id/feedback')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Add interview feedback' })
  addFeedback(
    @Param('id') id: string,
    @Body('feedback') feedback: string,
    @Body('rating') rating: number,
    @Request() req,
  ) {
    return this.applicationsService.addInterviewFeedback(id, feedback, rating, req.user.userId, req.user.role);
  }
}