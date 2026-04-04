// backend/src/modules/jobs/jobs.controller.ts
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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/entities/user.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';
@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

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

  @Get(':id/similar')
  @ApiOperation({ summary: 'Get similar jobs' })
  getSimilarJobs(@Param('id') id: string, @Query('limit') limit: number = 5) {
    return this.jobsService.getSimilarJobs(id, limit);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job' })
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto, @Request() req) {
    return this.jobsService.update(id, updateJobDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete job' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.jobsService.remove(id, req.user.userId, req.user.role);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save or unsave a job' })
  toggleSave(@Param('id') id: string, @Request() req) {
    return this.jobsService.toggleSaveJob(req.user.userId, id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @Request() req,
  ) {
    return this.jobsService.updateStatus(id, status, req.user.userId, req.user.role);
  }
}