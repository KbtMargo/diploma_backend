/**
 * Integration Test: JobsModule
 *
 * Тестуємо JobsService + JobsController разом.
 * TypeORM репозиторії замінено Mock Repository (фейкова база в пам'яті Jest).
 * Auth guards замінено on mock guards для спрощення.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { JobsService } from '../../src/jobs/jobs.service';
import { JobsController } from '../../src/jobs/jobs.controller';
import { Job, JobStatus, JobType } from '../../src/jobs/entities/job.entity';
import { SavedJob } from '../../src/jobs/entities/saved-job.entity';
import { User, UserRole } from '../../src/users/entities/user.entity';
import { Application } from '../../src/applications/entities/application.entity';
import { Skill } from '../../src/skills/entities/skill.entity';
import { Company } from '../../src/companies/entities/company.entity';
import { ApplicationsService } from '../../src/applications/applications.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/guards/roles.guard';

// Mock guard — пропускає всі запити з роллю employer
const mockJwtGuard: CanActivate = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    req.user = { id: 'emp-1', email: 'employer@test.com', role: UserRole.EMPLOYER };
    return true;
  },
};
const mockRolesGuard: CanActivate = { canActivate: () => true };

const makeQb = (jobs: any[] = [], total = 0) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([jobs, total]),
});

describe('Jobs Integration', () => {
  let app: INestApplication;

  const mockJobsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(() => makeQb()),
  };
  const mockSavedJobsRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn(), find: jest.fn() };
  const mockUsersRepo = { findOne: jest.fn() };
  const mockApplicationsRepo = { findOne: jest.fn(), findAndCount: jest.fn() };
  const mockSkillRepo = { findBy: jest.fn().mockResolvedValue([]) };
  const mockCompanyRepo = { findOne: jest.fn().mockResolvedValue(null), update: jest.fn() };

  const mockApplicationsService = {
    create: jest.fn(),
    findAllForApplicant: jest.fn(),
  };

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
      .overrideGuard(RolesGuard).useValue(mockRolesGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => await app.close());
  beforeEach(() => jest.clearAllMocks());

  // --- GET /jobs ---
  describe('GET /jobs', () => {
    it('повертає порожній список вакансій', async () => {
      mockJobsRepo.createQueryBuilder.mockReturnValue(makeQb([], 0));

      const res = await request(app.getHttpServer()).get('/jobs');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('повертає список вакансій', async () => {
      const jobs = [
        { id: 'j1', title: 'Frontend Dev', status: JobStatus.ACTIVE },
        { id: 'j2', title: 'Backend Dev', status: JobStatus.ACTIVE },
      ];
      mockJobsRepo.createQueryBuilder.mockReturnValue(makeQb(jobs, 2));

      const res = await request(app.getHttpServer()).get('/jobs');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // --- GET /jobs/:id ---
  describe('GET /jobs/:id', () => {
    it('повертає вакансію за ID', async () => {
      const job = { id: 'j1', title: 'QA Engineer', status: JobStatus.ACTIVE };
      mockJobsRepo.findOne.mockResolvedValue(job);

      const res = await request(app.getHttpServer()).get('/jobs/j1');

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('QA Engineer');
    });

    it('повертає 404 якщо вакансія не знайдена', async () => {
      mockJobsRepo.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).get('/jobs/ghost-id');

      expect(res.status).toBe(404);
    });
  });

  // --- POST /jobs ---
  describe('POST /jobs', () => {
    it('employer успішно створює вакансію', async () => {
      const created = { id: 'j3', title: 'DevOps Engineer', status: JobStatus.ACTIVE, employerId: 'emp-1' };
      mockJobsRepo.create.mockReturnValue(created);
      mockJobsRepo.save.mockResolvedValue(created);

      const res = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          title: 'DevOps Engineer',
          description: 'Searching for experienced DevOps engineer',
          jobType: 'full_time',
          workFormat: 'remote',
          country: 'Ukraine',
          city: 'Kyiv',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('DevOps Engineer');
    });
  });
});
