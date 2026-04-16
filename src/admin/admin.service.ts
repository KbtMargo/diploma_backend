import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { Company, CompanyStatus } from '../companies/entities/company.entity';
import { Application, ApplicationStatus } from '../applications/entities/application.entity';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  // User Management
  async getAllUsers(page: number = 1, limit: number = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const query = this.userRepository.createQueryBuilder('user');

    if (filters?.search) {
      query.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.role) {
      query.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    const [users, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['skills', 'applications', 'jobs'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserRole(id: string, role: UserRole, adminId: string): Promise<User> {
    const user = await this.getUserById(id);
    const oldRole = user.role;
    user.role = role;
    
    const updated = await this.userRepository.save(user);
    
    await this.logAudit({
      userId: adminId,
      action: AuditAction.USER_UPDATED,
      entityType: 'user',
      entityId: id,
      oldData: { role: oldRole },
      newData: { role },
    });
    
    return updated;
  }

  async blockUser(id: string, adminId: string): Promise<User> {
    const user = await this.getUserById(id);
    user.isActive = false;
    
    const updated = await this.userRepository.save(user);
    
    await this.logAudit({
      userId: adminId,
      action: AuditAction.USER_BLOCKED,
      entityType: 'user',
      entityId: id,
      oldData: { isActive: true },
      newData: { isActive: false },
    });
    
    return updated;
  }

  async unblockUser(id: string, adminId: string): Promise<User> {
    const user = await this.getUserById(id);
    user.isActive = true;
    
    const updated = await this.userRepository.save(user);
    
    await this.logAudit({
      userId: adminId,
      action: AuditAction.USER_UPDATED,
      entityType: 'user',
      entityId: id,
      oldData: { isActive: false },
      newData: { isActive: true },
    });
    
    return updated;
  }

  // Job Moderation
  async getAllJobs(page: number = 1, limit: number = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const query = this.jobRepository.createQueryBuilder('job')
      .leftJoinAndSelect('job.employer', 'employer');

    if (filters?.search) {
      query.andWhere('(job.title ILIKE :search OR job.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.status) {
      query.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters?.employerId) {
      query.andWhere('job.employerId = :employerId', { employerId: filters.employerId });
    }

    const [jobs, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('job.createdAt', 'DESC')
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

  async moderateJob(id: string, status: JobStatus, adminId: string, reason?: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['employer'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const oldStatus = job.status;
    job.status = status;

    const updated = await this.jobRepository.save(job);

    await this.logAudit({
      userId: adminId,
      action: AuditAction.JOB_MODERATED,
      entityType: 'job',
      entityId: id,
      oldData: { status: oldStatus },
      newData: { status, reason },
    });

    return updated;
  }

  // Companies Moderation
  async getAllCompanies(page: number = 1, limit: number = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const query = this.companyRepository.createQueryBuilder('company')
      .leftJoinAndSelect('company.owner', 'owner');

    if (filters?.search) {
      query.andWhere('company.name ILIKE :search', { search: `%${filters.search}%` });
    }

    if (filters?.status) {
      query.andWhere('company.status = :status', { status: filters.status });
    }

    const [companies, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('company.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: companies,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async verifyCompany(id: string, adminId: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.isVerified = true;
    company.verifiedAt = new Date();
    company.verifiedBy = adminId;
    company.status = CompanyStatus.VERIFIED;

    const updated = await this.companyRepository.save(company);

    await this.logAudit({
      userId: adminId,
      action: AuditAction.COMPANY_VERIFIED,
      entityType: 'company',
      entityId: id,
      oldData: { isVerified: false },
      newData: { isVerified: true },
    });

    return updated;
  }

  // Dashboard Statistics
  async getDashboardStats() {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - 7));
    const startOfMonth = new Date(now.setMonth(now.getMonth() - 1));

    const [
      totalUsers,
      newUsersToday,
      totalJobs,
      activeJobs,
      pendingJobs,
      totalCompanies,
      pendingCompanies,
      totalApplications,
      pendingApplications,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { createdAt: Between(startOfDay, new Date()) } }),
      this.jobRepository.count(),
      this.jobRepository.count({ where: { status: JobStatus.ACTIVE } }),
      this.jobRepository.count({ where: { status: JobStatus.PENDING } }),
      this.companyRepository.count(),
      this.companyRepository.count({ where: { status: CompanyStatus.PENDING } }),
      this.applicationRepository.count(),
      this.applicationRepository.count({ where: { status: ApplicationStatus.PENDING } }),
    ]);

    return {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        pending: pendingJobs,
      },
      companies: {
        total: totalCompanies,
        pending: pendingCompanies,
      },
      applications: {
        total: totalApplications,
        pending: pendingApplications,
      },
    };
  }

  async getPlatformAnalytics(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const userGrowth = await this.userRepository
      .createQueryBuilder('user')
      .select("DATE(user.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    const jobPostings = await this.jobRepository
      .createQueryBuilder('job')
      .select("DATE(job.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('job.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    const applicationsByStatus = await this.applicationRepository
      .createQueryBuilder('application')
      .select('application.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('application.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('application.status')
      .getRawMany();

    const topIndustries = await this.jobRepository
      .createQueryBuilder('job')
      .select('job.category', 'industry')
      .addSelect('COUNT(*)', 'count')
      .where('job.category IS NOT NULL')
      .groupBy('job.category')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const topCountries = await this.jobRepository
      .createQueryBuilder('job')
      .select('job.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.country')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      userGrowth,
      jobPostings,
      applicationsByStatus,
      topIndustries,
      topCountries,
    };
  }

async getAuditLogs(page: number = 1, limit: number = 10, filters?: any) {
  const skip = (page - 1) * limit;
  const query = this.auditLogRepository
    .createQueryBuilder('log')
    .leftJoinAndSelect('log.user', 'user'); // ← додати

  if (filters?.userId) {
    query.andWhere('log.userId = :userId', { userId: filters.userId });
  }

  if (filters?.action) {
    query.andWhere('log.action = :action', { action: filters.action });
  }

  if (filters?.entityType) {
    query.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
  }

  const [logs, total] = await query
    .skip(skip)
    .take(limit)
    .orderBy('log.createdAt', 'DESC')
    .getManyAndCount();

  return {
    data: logs,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

  private async logAudit(data: Partial<AuditLog>): Promise<AuditLog> {
    const log = this.auditLogRepository.create(data);
    return await this.auditLogRepository.save(log);
  }
}