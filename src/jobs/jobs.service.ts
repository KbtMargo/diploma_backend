// src/jobs/jobs.service.ts
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Job, JobStatus } from './entities/job.entity';
import { SavedJob } from './entities/saved-job.entity';
import { User } from '../users/entities/user.entity';
import { Application } from '../applications/entities/application.entity';
import { Skill } from '../skills/entities/skill.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    @InjectRepository(SavedJob)
    private savedJobsRepository: Repository<SavedJob>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Application)
    private applicationsRepository: Repository<Application>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
  ) {}

  async create(createJobDto: CreateJobDto, employerId: string): Promise<Job> {
    const { skillIds, ...jobData } = createJobDto;
    const job = this.jobsRepository.create({ ...jobData, employerId });
    if (skillIds && skillIds.length > 0) {
      job.requiredSkills = await this.skillRepository.findBy({ id: In(skillIds) });
    }
    return this.jobsRepository.save(job);
  }

  async findAll(page = 1, limit = 10, filters?: SearchJobsDto): Promise<{ data: Job[]; meta: any }> {
    const query = this.jobsRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.employer', 'employer')
      .leftJoinAndSelect('job.requiredSkills', 'skills')
      .where('job.status = :status', { status: JobStatus.ACTIVE });

    if (filters?.search) {
      query.andWhere('(job.title ILIKE :search OR job.description ILIKE :search)', { search: `%${filters.search}%` });
    }
    if (filters?.country) {
      query.andWhere('job.country ILIKE :country', { country: `%${filters.country}%` });
    }
    if (filters?.city) {
      query.andWhere('job.city ILIKE :city', { city: `%${filters.city}%` });
    }
    if (filters?.jobType?.length) {
      query.andWhere('job.jobType IN (:...jobType)', { jobType: filters.jobType });
    }
    if (filters?.experienceLevel?.length) {
      query.andWhere('job.experienceLevel IN (:...experienceLevel)', { experienceLevel: filters.experienceLevel });
    }
    if (filters?.workFormat?.length) {
      query.andWhere('job.workFormat IN (:...workFormat)', { workFormat: filters.workFormat });
    }
    if (filters?.salaryMin) {
      query.andWhere('job.salaryMin >= :salaryMin', { salaryMin: filters.salaryMin });
    }
    if (filters?.salaryMax) {
      query.andWhere('job.salaryMax <= :salaryMax', { salaryMax: filters.salaryMax });
    }
    if (filters?.category) {
      query.andWhere('job.category = :category', { category: filters.category });
    }
    if (filters?.language?.length) {
      query.andWhere('job.requiredLanguages && :language', { language: filters.language });
    }
    if (filters?.isPaid !== undefined) {
      query.andWhere('job.isPaid = :isPaid', { isPaid: filters.isPaid });
    }

    const [jobs, total] = await query
      .orderBy('job.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data: jobs, meta: { total, page, limit } };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobsRepository.findOne({
      where: { id },
      relations: ['employer', 'employer.company', 'requiredSkills'],
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto, userId: string, userRole: string): Promise<Job> {
    const job = await this.findOne(id);
    if (job.employerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to update this job');
    }
    const { skillIds, ...jobData } = updateJobDto;
    Object.assign(job, jobData);
    if (skillIds !== undefined) {
      job.requiredSkills = skillIds.length > 0
        ? await this.skillRepository.findBy({ id: In(skillIds) })
        : [];
    }
    return this.jobsRepository.save(job);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const job = await this.findOne(id);
    if (job.employerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this job');
    }
    await this.jobsRepository.remove(job);
  }

  async updateStatus(id: string, status: JobStatus, userId: string, userRole: string): Promise<Job> {
    const job = await this.findOne(id);
    if (job.employerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to update job status');
    }
    job.status = status;
    return this.jobsRepository.save(job);
  }

  async getEmployerJobs(employerId: string, page = 1, limit = 10): Promise<{ data: Job[]; meta: any }> {
    const [jobs, total] = await this.jobsRepository.findAndCount({
      where: { employerId },
      relations: ['employer', 'requiredSkills'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: jobs, meta: { total, page, limit } };
  }

  async incrementViews(jobId: string): Promise<{ success: boolean }> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    job.views = (job.views || 0) + 1;
    await this.jobsRepository.save(job);
    return { success: true };
  }

  async isJobSaved(jobId: string, userId: string): Promise<boolean> {
    const saved = await this.savedJobsRepository.findOne({ where: { jobId, userId } });
    return !!saved;
  }

  async saveJob(jobId: string, userId: string): Promise<void> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const existing = await this.savedJobsRepository.findOne({ where: { jobId, userId } });
    if (existing) throw new ConflictException('Job already saved');
    const savedJob = this.savedJobsRepository.create({ jobId, userId, job, user });
    await this.savedJobsRepository.save(savedJob);
  }

  async unsaveJob(jobId: string, userId: string): Promise<void> {
    const saved = await this.savedJobsRepository.findOne({ where: { jobId, userId } });
    if (!saved) throw new NotFoundException('Saved job not found');
    await this.savedJobsRepository.remove(saved);
  }

  async getSavedJobs(userId: string, page = 1, limit = 10): Promise<{ data: Job[]; meta: any }> {
    const [savedJobs, total] = await this.savedJobsRepository.findAndCount({
      where: { userId },
      relations: ['job', 'job.employer', 'job.requiredSkills'],
      order: { savedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const jobs = savedJobs.map(sj => sj.job);
    return { data: jobs, meta: { total, page, limit } };
  }

  async getSimilarJobs(jobId: string, limit = 5): Promise<Job[]> {
    const job = await this.jobsRepository.findOne({
      where: { id: jobId },
      relations: ['employer', 'requiredSkills'],
    });
    if (!job) throw new NotFoundException('Job not found');
    return this.jobsRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.employer', 'employer')
      .leftJoinAndSelect('job.requiredSkills', 'skill')
      .where('job.id != :jobId', { jobId })
      .andWhere('(job.employerId = :employerId OR job.category = :category)', {
        employerId: job.employerId,
        category: job.category,
      })
      .andWhere('job.status = :status', { status: JobStatus.ACTIVE })
      .orderBy('job.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getStatistics() {
    const totalJobs = await this.jobsRepository.count();
    const activeJobs = await this.jobsRepository.count({ where: { status: JobStatus.ACTIVE } });
    const totalApplications = await this.applicationsRepository.count();
    const topEmployers = await this.jobsRepository
      .createQueryBuilder('job')
      .select('job.employerId', 'employerId')
      .addSelect('COUNT(job.id)', 'jobCount')
      .groupBy('job.employerId')
      .orderBy('jobCount', 'DESC')
      .limit(10)
      .getRawMany();
    return { totalJobs, activeJobs, totalApplications, topEmployers };
  }

  async getJobApplications(jobId: string, page = 1, limit = 20) {
    const [applications, total] = await this.applicationsRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.applicant', 'user')
      .leftJoinAndSelect('app.job', 'job')
      .where('app.jobId = :jobId', { jobId })
      .orderBy('app.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data: applications, meta: { total, page, limit } };
  }

  async incrementApplicationsCount(jobId: string): Promise<void> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (job) {
      job.applicationsCount = (job.applicationsCount || 0) + 1;
      await this.jobsRepository.save(job);
    }
  }
}