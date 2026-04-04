import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Application, ApplicationStatus } from './entities/application.entity';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { JobsService } from '../jobs/jobs.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jobsService: JobsService,
  ) {}

  async create(createApplicationDto: CreateApplicationDto, applicantId: string): Promise<Application> {
    const job = await this.jobRepository.findOne({
      where: { id: createApplicationDto.jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== JobStatus.ACTIVE) {
      throw new BadRequestException('This job is no longer accepting applications');
    }

    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      throw new BadRequestException('Application deadline has passed');
    }

    // Check if already applied
    const existingApplication = await this.applicationRepository.findOne({
      where: {
        applicantId,
        jobId: createApplicationDto.jobId,
      },
    });

    if (existingApplication) {
      throw new BadRequestException('You have already applied for this job');
    }

    const application = this.applicationRepository.create({
      ...createApplicationDto,
      applicantId,
      jobId: job.id,
      status: ApplicationStatus.PENDING,
    });

    const savedApplication = await this.applicationRepository.save(application);

    // Increment applications count on job
    await this.jobsService.incrementApplicationsCount(job.id);

    // TODO: Send notification to employer
    // await this.notifyEmployer(job.employerId, savedApplication);

    return savedApplication;
  }

  async findAllForApplicant(
    applicantId: string,
    page: number = 1,
    limit: number = 10,
    status?: ApplicationStatus,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { applicantId };
    if (status) {
      where.status = status;
    }

    const [applications, total] = await this.applicationRepository.findAndCount({
      where,
      relations: ['job', 'job.employer'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: applications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllForEmployer(
    employerId: string,
    page: number = 1,
    limit: number = 10,
    jobId?: string,
    status?: ApplicationStatus,
  ) {
    const skip = (page - 1) * limit;
    const query = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.applicant', 'applicant')
      .where('job.employerId = :employerId', { employerId });

    if (jobId) {
      query.andWhere('application.jobId = :jobId', { jobId });
    }

    if (status) {
      query.andWhere('application.status = :status', { status });
    }

    const [applications, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('application.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: applications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string, userRole: string): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['job', 'job.employer', 'applicant'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      application.applicantId !== userId &&
      application.job.employerId !== userId
    ) {
      throw new ForbiddenException('You do not have permission to view this application');
    }

    return application;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateApplicationStatusDto,
    userId: string,
    userRole: string,
  ): Promise<Application> {
    const application = await this.findOne(id, userId, userRole);

    // Check if user is employer or admin
    if (userRole !== UserRole.ADMIN && application.job.employerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this application');
    }

    const oldStatus = application.status;
    application.status = updateStatusDto.status;
    application.employerNotes = updateStatusDto.employerNotes || application.employerNotes;
    application.reviewedAt = new Date();
    application.reviewedBy = userId;

    if (updateStatusDto.interviewDetails) {
      application.interviewDetails = updateStatusDto.interviewDetails;
    }

    const updatedApplication = await this.applicationRepository.save(application);

    // TODO: Send notification to applicant about status change
    // await this.notifyApplicant(application.applicantId, updatedApplication, oldStatus);

    return updatedApplication;
  }

  async withdraw(id: string, applicantId: string): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id, applicantId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status === ApplicationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot withdraw an accepted application');
    }

    application.status = ApplicationStatus.WITHDRAWN;
    return await this.applicationRepository.save(application);
  }

  async addInterviewFeedback(
    id: string,
    feedback: string,
    rating: number,
    userId: string,
    userRole: string,
  ): Promise<Application> {
    const application = await this.findOne(id, userId, userRole);

    if (userRole !== UserRole.ADMIN && application.job.employerId !== userId) {
      throw new ForbiddenException('You do not have permission to add feedback');
    }

    if (!application.interviewDetails) {
      throw new BadRequestException('No interview scheduled for this application');
    }

    application.interviewDetails.feedback = feedback;
    application.rating = rating;
    application.status = ApplicationStatus.INTERVIEWED;

    return await this.applicationRepository.save(application);
  }

  async getStatistics(employerId?: string) {
    const query = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job');

    if (employerId) {
      query.where('job.employerId = :employerId', { employerId });
    }

    const total = await query.getCount();
    const byStatus = await query
      .select('application.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('application.status')
      .getRawMany();

    const applicationsByDay = await query
      .select("DATE(application.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy('date')
      .orderBy('date', 'DESC')
      .limit(30)
      .getRawMany();

    const averageResponseTime = await query
      .where('application.reviewedAt IS NOT NULL')
      .select("AVG(EXTRACT(EPOCH FROM (application.reviewedAt - application.createdAt)))", 'avgTime')
      .getRawOne();

    return {
      total,
      byStatus,
      applicationsByDay,
      averageResponseTime: averageResponseTime?.avgTime ? Math.round(averageResponseTime.avgTime / 3600) : null, // in hours
    };
  }
}