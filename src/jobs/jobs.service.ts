import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, ILike, LessThanOrEqual, MoreThanOrEqual, FindOptionsWhere } from 'typeorm';
import { Job, JobStatus, JobType, ExperienceLevel, WorkFormat } from './entities/job.entity';
import { SavedJob } from './entities/saved-job.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(SavedJob)
    private readonly savedJobRepository: Repository<SavedJob>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createJobDto: CreateJobDto, employerId: string): Promise<Job> {
    const employer = await this.userRepository.findOne({
      where: { id: employerId },
    });

    if (!employer) {
      throw new NotFoundException('Employer not found');
    }

    // Process skills
    let requiredSkills: Skill[] = [];
    if (createJobDto.skillIds && createJobDto.skillIds.length > 0) {
      requiredSkills = await this.skillRepository.findBy({
        id: In(createJobDto.skillIds),
      });
    }

    const job = this.jobRepository.create({
      ...createJobDto,
      employer,
      employerId,
      requiredSkills,
      status: JobStatus.ACTIVE,
      publishedAt: new Date(),
      expiresAt: createJobDto.applicationDeadline 
        ? new Date(createJobDto.applicationDeadline)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    });

    return await this.jobRepository.save(job);
  }

  async findAll(page: number = 1, limit: number = 10, filters?: SearchJobsDto) {
    const skip = (page - 1) * limit;
    const query = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.employer', 'employer')
      .leftJoinAndSelect('job.requiredSkills', 'skills')
      .where('job.status = :status', { status: JobStatus.ACTIVE });

    // Apply filters
    if (filters) {
      if (filters.search) {
        query.andWhere(
          '(job.title ILIKE :search OR job.description ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }

      if (filters.country) {
        query.andWhere('job.country ILIKE :country', { country: `%${filters.country}%` });
      }

      if (filters.city) {
        query.andWhere('job.city ILIKE :city', { city: `%${filters.city}%` });
      }

      if (filters.jobType && filters.jobType.length > 0) {
        query.andWhere('job.jobType IN (:...jobTypes)', { jobTypes: filters.jobType });
      }

      if (filters.experienceLevel && filters.experienceLevel.length > 0) {
        query.andWhere('job.experienceLevel IN (:...experienceLevels)', {
          experienceLevels: filters.experienceLevel,
        });
      }

      if (filters.workFormat && filters.workFormat.length > 0) {
        query.andWhere('job.workFormat IN (:...workFormats)', {
          workFormats: filters.workFormat,
        });
      }

      if (filters.salaryMin) {
        query.andWhere('job.salaryMin >= :salaryMin', { salaryMin: filters.salaryMin });
      }

      if (filters.salaryMax) {
        query.andWhere('job.salaryMax <= :salaryMax', { salaryMax: filters.salaryMax });
      }

      if (filters.skillIds && filters.skillIds.length > 0) {
        query.innerJoin('job.requiredSkills', 'skill', 'skill.id IN (:...skillIds)', {
          skillIds: filters.skillIds,
        });
      }

      if (filters.language && filters.language.length > 0) {
        query.andWhere('job.requiredLanguages && ARRAY[:...languages]::text[]', {
          languages: filters.language,
        });
      }

      if (filters.isRemote !== undefined) {
        query.andWhere('job.isRemote = :isRemote', { isRemote: filters.isRemote });
      }

      if (filters.category) {
        query.andWhere('job.category = :category', { category: filters.category });
      }

      if (filters.tags && filters.tags.length > 0) {
        query.andWhere('job.tags && ARRAY[:...tags]::text[]', { tags: filters.tags });
      }

      if (filters.isFeatured) {
        query.andWhere('job.isFeatured = :isFeatured', { isFeatured: filters.isFeatured });
      }

      if (filters.isUrgent) {
        query.andWhere('job.isUrgent = :isUrgent', { isUrgent: filters.isUrgent });
      }
    }

    const [jobs, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy(
        filters?.sortBy === 'salary' ? 'job.salaryMax' : 'job.createdAt',
        filters?.sortOrder === 'ASC' ? 'ASC' : 'DESC',
      )
      .getManyAndCount();

    return {
      data: jobs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['employer', 'requiredSkills', 'applications'],
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Increment views
    await this.jobRepository.increment({ id }, 'views', 1);

    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto, userId: string, userRole: string): Promise<Job> {
    const job = await this.findOne(id);

    // Check permissions
    if (userRole !== UserRole.ADMIN && job.employerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this job');
    }

    // Update skills if provided
    if (updateJobDto.skillIds) {
      const skills = await this.skillRepository.findBy({
        id: In(updateJobDto.skillIds),
      });
      job.requiredSkills = skills;
      delete updateJobDto.skillIds;
    }

    Object.assign(job, updateJobDto);
    return await this.jobRepository.save(job);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const job = await this.findOne(id);

    if (userRole !== UserRole.ADMIN && job.employerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this job');
    }

    await this.jobRepository.remove(job);
  }

  async getEmployerJobs(employerId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [jobs, total] = await this.jobRepository.findAndCount({
      where: { employerId },
      relations: ['requiredSkills'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: jobs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleSaveJob(userId: string, jobId: string): Promise<{ saved: boolean }> {
    const existing = await this.savedJobRepository.findOne({
      where: { userId, jobId },
    });

    if (existing) {
      await this.savedJobRepository.remove(existing);
      return { saved: false };
    }

    const savedJob = this.savedJobRepository.create({
      userId,
      jobId,
    });
    await this.savedJobRepository.save(savedJob);
    return { saved: true };
  }

  async getSavedJobs(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [savedJobs, total] = await this.savedJobRepository.findAndCount({
      where: { userId },
      relations: ['job', 'job.employer', 'job.requiredSkills'],
      skip,
      take: limit,
      order: { savedAt: 'DESC' },
    });

    return {
      data: savedJobs.map(sj => sj.job),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, status: JobStatus, userId: string, userRole: string): Promise<Job> {
    const job = await this.findOne(id);

    if (userRole !== UserRole.ADMIN && job.employerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this job');
    }

    job.status = status;
    return await this.jobRepository.save(job);
  }

  async getSimilarJobs(jobId: string, limit: number = 5): Promise<Job[]> {
    const job = await this.findOne(jobId);
    const skillIds = job.requiredSkills.map(skill => skill.id);

    if (skillIds.length === 0) {
      return [];
    }

    const similarJobs = await this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.requiredSkills', 'skills')
      .leftJoinAndSelect('job.employer', 'employer')
      .where('job.id != :jobId', { jobId })
      .andWhere('job.status = :status', { status: JobStatus.ACTIVE })
      .andWhere('skills.id IN (:...skillIds)', { skillIds })
      .take(limit)
      .getMany();

    return similarJobs;
  }

  async getStatistics() {
    const totalJobs = await this.jobRepository.count();
    const activeJobs = await this.jobRepository.count({
      where: { status: JobStatus.ACTIVE },
    });
    const featuredJobs = await this.jobRepository.count({
      where: { isFeatured: true },
    });
    const urgentJobs = await this.jobRepository.count({
      where: { isUrgent: true },
    });

    const jobsByType = await this.jobRepository
      .createQueryBuilder('job')
      .select('job.jobType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.jobType')
      .getRawMany();

    const jobsByCountry = await this.jobRepository
      .createQueryBuilder('job')
      .select('job.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .where('job.status = :status', { status: JobStatus.ACTIVE })
      .groupBy('job.country')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalJobs,
      activeJobs,
      featuredJobs,
      urgentJobs,
      jobsByType,
      jobsByCountry,
    };
  }

  async incrementApplicationsCount(jobId: string): Promise<void> {
    await this.jobRepository.increment({ id: jobId }, 'applicationsCount', 1);
  }
}