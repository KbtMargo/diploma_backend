import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { JobStatus } from '../jobs/entities/job.entity';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard
  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get platform analytics' })
  getPlatformAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getPlatformAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // User Management
  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: any,
  ) {
    return this.adminService.getAllUsers(page, limit, filters);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateUserRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @Request() req,
  ) {
    return this.adminService.updateUserRole(id, role, req.user.userId);
  }

  @Put('users/:id/block')
  @ApiOperation({ summary: 'Block user' })
  blockUser(@Param('id') id: string, @Request() req) {
    return this.adminService.blockUser(id, req.user.userId);
  }

  @Put('users/:id/unblock')
  @ApiOperation({ summary: 'Unblock user' })
  unblockUser(@Param('id') id: string, @Request() req) {
    return this.adminService.unblockUser(id, req.user.userId);
  }

  // Job Moderation
  @Get('jobs')
  @ApiOperation({ summary: 'Get all jobs for moderation' })
  getAllJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: any,
  ) {
    return this.adminService.getAllJobs(page, limit, filters);
  }

  @Put('jobs/:id/moderate')
  @ApiOperation({ summary: 'Moderate job' })
  moderateJob(
    @Param('id') id: string,
    @Body('status') status: JobStatus,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.adminService.moderateJob(id, status, req.user.userId, reason);
  }

  // Company Moderation
  @Get('companies')
  @ApiOperation({ summary: 'Get all companies' })
  getAllCompanies(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: any,
  ) {
    return this.adminService.getAllCompanies(page, limit, filters);
  }

  @Post('companies/:id/verify')
  @ApiOperation({ summary: 'Verify company' })
  verifyCompany(@Param('id') id: string, @Request() req) {
    return this.adminService.verifyCompany(id, req.user.userId);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  getAuditLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: any,
  ) {
    return this.adminService.getAuditLogs(page, limit, filters);
  }
}