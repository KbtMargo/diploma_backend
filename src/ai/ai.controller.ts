import { Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/entities/user.entity';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze/:applicationId')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'AI analysis of a job application' })
  analyzeApplication(
    @Param('applicationId') applicationId: string,
    @Request() req,
  ) {
    return this.aiService.analyzeApplication(applicationId, req.user.userId);
  }

  @Post('analyze-job/:jobId')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Batch AI analysis of all applications for a job' })
  analyzeJobApplications(
    @Param('jobId') jobId: string,
    @Request() req,
  ) {
    return this.aiService.analyzeJobApplications(jobId, req.user.userId);
  }
}
