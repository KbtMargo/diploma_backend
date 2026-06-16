import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ApplicationsService } from '../applications/applications.service';
import { JobStatus } from './entities/job.entity';
import { CreateApplicationDto } from '../applications/dto/create-application.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new job' })
  create(@Body() createJobDto: CreateJobDto, @Request() req) {
    return this.jobsService.create(createJobDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all jobs with filters' })
  findAll(@Query() searchDto: SearchJobsDto) {
    return this.jobsService.findAll(searchDto.page, searchDto.limit, searchDto);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get jobs statistics (admin only)' })
  getStatistics() {
    return this.jobsService.getStatistics();
  }

  @Get('employer/:employerId')
  @ApiOperation({ summary: 'Get jobs by employer' })
  getEmployerJobs(
    @Param('employerId') employerId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.jobsService.getEmployerJobs(employerId, page, limit);
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved jobs' })
  getSavedJobs(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.jobsService.getSavedJobs(req.user.userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job' })
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto, @Request() req) {
    return this.jobsService.update(id, updateJobDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete job' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.jobsService.remove(id, req.user.userId, req.user.role);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job status' })
  updateStatus(@Param('id') id: string, @Body('status') status: JobStatus, @Request() req) {
    return this.jobsService.updateStatus(id, status, req.user.userId, req.user.role);
  }

  @Post(':id/view')
  async incrementView(@Param('id') jobId: string) {
    return this.jobsService.incrementViews(jobId);
  }

  @Get(':id/saved')
  @UseGuards(JwtAuthGuard)
  async checkIfSaved(@Param('id') jobId: string, @Request() req) {
    const isSaved = await this.jobsService.isJobSaved(jobId, req.user.userId);
    return { isSaved };
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  async saveJob(@Param('id') jobId: string, @Request() req) {
    await this.jobsService.saveJob(jobId, req.user.userId);
    return { saved: true };
  }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  async unsaveJob(@Param('id') jobId: string, @Request() req) {
    await this.jobsService.unsaveJob(jobId, req.user.userId);
    return { saved: false };
  }

  @Post(':id/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.JOB_SEEKER)
  async applyToJob(
    @Param('id') jobId: string,
    @Body() data: { coverLetter: string; expectedSalary?: number; expectedSalaryCurrency?: string },
    @Request() req,
  ) {
    const createDto = new CreateApplicationDto();
    createDto.jobId = jobId;
    createDto.coverLetter = data.coverLetter;
    createDto.expectedSalary = data.expectedSalary;
    createDto.expectedSalaryCurrency = data.expectedSalaryCurrency || 'USD';
    const application = await this.applicationsService.create(createDto, req.user.userId);
    return { success: true, applicationId: application.id };
  }

  @Get('applications/check/:id')
  @UseGuards(JwtAuthGuard)
  async checkIfApplied(@Param('id') jobId: string, @Request() req) {
    const hasApplied = await this.applicationsService.hasUserApplied(jobId, req.user.userId);
    return { hasApplied };
  }
}