/**
 * Feature Test: Jobs Flow (E2E)
 *
 * Тестує повний сценарій роботи з вакансіями:
 *   employer створює вакансію → job_seeker переглядає → пошук з фільтром
 *
 * Auth guard мокується (пропускає без реального JWT).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { JobsController } from '../src/jobs/jobs.controller';
import { JobsService } from '../src/jobs/jobs.service';
import { Job, JobStatus, JobType, WorkFormat } from '../src/jobs/entities/job.entity';
import { SavedJob } from '../src/jobs/entities/saved-job.entity';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Application } from '../src/applications/entities/application.entity';
import { Skill } from '../src/skills/entities/skill.entity';
import { Company } from '../src/companies/entities/company.entity';
import { ApplicationsService } from '../src/applications/applications.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

let currentUserRole = UserRole.EMPLOYER;

const mockJwtGuard: CanActivate = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    req.user = { id: 'emp-1', userId: 'emp-1', email: 'employer@startway.ua', role: currentUserRole };
    return true;
  },
};

const makeQb = (jobs: any[] = [], total = 0) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([jobs, total]),
});

describe('Jobs Feature (E2E)', () => {
  let app: INestApplication;

  // Фейкова in-memory колекція вакансій
  const jobsStore: Record<string, any> = {};

  const mockJobsRepo = {
    create: jest.fn((data) => ({ id: `job-${Date.now()}`, status: JobStatus.ACTIVE, ...data })),
    save: jest.fn((job) => {
      jobsStore[job.id] = job;
      return Promise.resolve(job);
    }),
    findOne: jest.fn(({ where }) => Promise.resolve(jobsStore[where.id] ?? null)),
    count: jest.fn().mockResolvedValue(Object.keys(jobsStore).length),
    createQueryBuilder: jest.fn(() => makeQb()),
  };

  const mockSavedJobsRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn(), find: jest.fn() };
  const mockUsersRepo = { findOne: jest.fn() };
  const mockApplicationsRepo = { findOne: jest.fn() };
  const mockSkillRepo = { findBy: jest.fn().mockResolvedValue([]) };
  const mockCompanyRepo = { findOne: jest.fn().mockResolvedValue(null), update: jest.fn() };
  const mockApplicationsService = { create: jest.fn(), findAllForApplicant: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        JobsService,
        { provide: ApplicationsService, useValue: mockApplicationsService },
        { provide: getRepositoryToken(Job), useValue: mockJobsRepo },
        { provide: getRepositoryToken(SavedJob), useValue: mockSavedJobsRepo },
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: getRepositoryToken(Application), useValue: mockApplicationsRepo },
        { provide: getRepositoryToken(Skill), useValue: mockSkillRepo },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockJwtGuard)
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => await app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('Повний сценарій: employer створює вакансію, job_seeker переглядає', () => {
    let jobId: string;

    it('1. POST /jobs — employer публікує вакансію (201)', async () => {
      currentUserRole = UserRole.EMPLOYER;
      const jobData = {
        title: 'Junior React Developer',
        description: 'Шукаємо junior розробника для фінтех проекту',
        jobType: JobType.FULL_TIME,
        workFormat: WorkFormat.REMOTE,
        salaryMin: 800,
        salaryMax: 1200,
        country: 'Україна',
        city: 'Київ',
      };
      const createdJob = { id: 'job-react-1', ...jobData, employerId: 'emp-1', status: JobStatus.ACTIVE, isPaid: true };
      mockJobsRepo.create.mockReturnValue(createdJob);
      mockJobsRepo.save.mockResolvedValue(createdJob);
      jobsStore['job-react-1'] = createdJob;

      const res = await request(app.getHttpServer()).post('/jobs').send({
        ...jobData,
        workFormat: 'remote',
        country: 'Ukraine',
        city: 'Kyiv',
      });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Junior React Developer');
      expect(res.body.isPaid).toBe(true);
      jobId = res.body.id;
    });

    it('2. GET /jobs — job_seeker бачить список вакансій', async () => {
      const jobs = [{ id: 'job-react-1', title: 'Junior React Developer', status: JobStatus.ACTIVE }];
      mockJobsRepo.createQueryBuilder.mockReturnValue(makeQb(jobs, 1));

      const res = await request(app.getHttpServer()).get('/jobs');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('3. GET /jobs/:id — отримує детальну інформацію про вакансію', async () => {
      mockJobsRepo.findOne.mockResolvedValue({
        id: 'job-react-1',
        title: 'Junior React Developer',
        status: JobStatus.ACTIVE,
        salaryMin: 800,
        salaryMax: 1200,
      });

      const res = await request(app.getHttpServer()).get('/jobs/job-react-1');

      expect(res.status).toBe(200);
      expect(res.body.salaryMin).toBe(800);
    });

    it('4. GET /jobs — пошук з фільтром (результат порожній)', async () => {
      mockJobsRepo.createQueryBuilder.mockReturnValue(makeQb([], 0));

      const res = await request(app.getHttpServer()).get('/jobs?search=PHP+developer');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('5. GET /jobs/ghost-id — 404 для неіснуючої вакансії', async () => {
      mockJobsRepo.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).get('/jobs/ghost-id');

      expect(res.status).toBe(404);
    });
  });
});
