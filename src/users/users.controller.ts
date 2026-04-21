// backend/src/users/users.controller.ts
import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto'; // ← додати
import { UpdateResumeDto } from './dto/update-resume.dto'; 
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (admin only)' })
  findAll(@Query('page') page: number, @Query('limit') limit: number, @Query() filters: any) {
    return this.usersService.findAll(page, limit, filters);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user resume' })
  getResume(@Request() req) {
    return this.usersService.getResume(req.user.userId);
  }

  @Get('saved-jobs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved jobs' })
  getSavedJobs(@Request() req) {
    return this.usersService.getSavedJobs(req.user.userId);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user statistics' })
  getStatistics(@Request() req) {
    return this.usersService.getStatistics(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Put('resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user resume' })
  updateResume(@Request() req, @Body() updateResumeDto: UpdateResumeDto) {
    return this.usersService.updateResume(req.user.userId, updateResumeDto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload avatar' })
  uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(req.user.userId, file);
  }

  @Post('resume-file')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('resume'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload resume PDF' })
  uploadResume(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadResume(req.user.userId, file);
  }

  @Post('jobs/:jobId/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a job' })
  saveJob(@Request() req, @Param('jobId') jobId: string) {
    return this.usersService.toggleSavedJob(req.user.userId, jobId);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete account' })
  deleteAccount(@Request() req) {
    return this.usersService.deleteAccount(req.user.userId);
  }
}