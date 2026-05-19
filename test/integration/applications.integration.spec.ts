/**
 * Integration Test: ApplicationsModule
 *
 * Тестуємо ApplicationsController + ApplicationsService разом.
 * Всі TypeORM репозиторії замінені Mock Repository — фейкова база в пам'яті.
 * JwtAuthGuard мокується щоб передати user без реального токену.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ApplicationsController } from '../../src/applications/applications.controller';
import { ApplicationsService } from '../../src/applications/applications.service';
import { Application, ApplicationStatus } from '../../src/applications/entities/application.entity';
import { Job, JobStatus } from '../../src/jobs/entities/job.entity';
import { User, UserRole } from '../../src/users/entities/user.entity';
import { JobsService } from '../../src/jobs/jobs.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/guards/roles.guard';

// Валідні UUID для @IsUUID() перевірки в DTO
const JOB_UUID = '550e8400-e29b-41d4-a716-446655440001';
const JOB_UUID_FILLED = '550e8400-e29b-41d4-a716-446655440002';
const JOB_UUID_GHOST = '550e8400-e29b-41d4-a716-446655440099';

// Mock guard — пропускає запит з роллю job_seeker
const mockJwtGuard: CanActivate = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    req.user = { userId: 'seeker-1', email: 'seeker@test.com', role: UserRole.JOB_SEEKER };
    return true;
  },
};

describe('Applications Integration', () => {
  let app: INestApplication;

  const mockApplicationRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockJobRepo = { findOne: jest.fn() };
  const mockUserRepo = { findOne: jest.fn() };
  const mockJobsService = { incrementApplicationsCount: jest.fn().mockResolvedValue(undefined) };
  const mockNotificationsService = {
    sendNewApplicationNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        ApplicationsService,
        { provide: getRepositoryToken(Application), useValue: mockApplicationRepo },
        { provide: getRepositoryToken(Job), useValue: mockJobRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JobsService, useValue: mockJobsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
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

  // --- POST /applications ---
  describe('POST /applications', () => {
    it('успішно подає заявку на активну вакансію', async () => {
      const job = { id: JOB_UUID, status: JobStatus.ACTIVE, applicationDeadline: null, employerId: 'emp-1', title: 'Dev' };
      const app_entry = { id: 'app-1', jobId: JOB_UUID, applicantId: 'seeker-1', status: ApplicationStatus.PENDING };

      mockJobRepo.findOne.mockResolvedValue(job);
      mockApplicationRepo.findOne.mockResolvedValue(null);
      mockApplicationRepo.create.mockReturnValue(app_entry);
      mockApplicationRepo.save.mockResolvedValue(app_entry);
      mockUserRepo.findOne.mockResolvedValue({ firstName: 'Іван', lastName: 'Коваль' });

      const res = await request(app.getHttpServer())
        .post('/applications')
        .send({ jobId: JOB_UUID });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(ApplicationStatus.PENDING);
    });

    it('повертає 404 якщо вакансія не існує', async () => {
      mockJobRepo.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/applications')
        .send({ jobId: JOB_UUID_GHOST });

      expect(res.status).toBe(404);
    });

    it('повертає 400 якщо вакансія вже закрита', async () => {
      mockJobRepo.findOne.mockResolvedValue({ id: JOB_UUID_FILLED, status: JobStatus.FILLED });

      const res = await request(app.getHttpServer())
        .post('/applications')
        .send({ jobId: JOB_UUID_FILLED });

      expect(res.status).toBe(400);
    });
  });

  // --- GET /applications/my ---
  describe('GET /applications/my', () => {
    it('повертає список заявок поточного користувача', async () => {
      const apps = [{ id: 'a1', status: ApplicationStatus.PENDING }, { id: 'a2', status: ApplicationStatus.REVIEWED }];
      mockApplicationRepo.findAndCount.mockResolvedValue([apps, 2]);

      const res = await request(app.getHttpServer()).get('/applications/my');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });
  });
});
