/**
 * Feature Test: Applications Flow (E2E)
 *
 * Тестує повний сценарій подачі заявок:
 *   job_seeker подає заявку → переглядає свої заявки →
 *   employer переглядає заявки на вакансію → змінює статус
 *
 * Auth guard мокується для job_seeker і employer ролей.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ApplicationsController } from '../src/applications/applications.controller';
import { ApplicationsService } from '../src/applications/applications.service';
import { Application, ApplicationStatus } from '../src/applications/entities/application.entity';
import { Job, JobStatus } from '../src/jobs/entities/job.entity';
import { User, UserRole } from '../src/users/entities/user.entity';
import { JobsService } from '../src/jobs/jobs.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

let mockUser = { userId: 'seeker-1', email: 'seeker@test.com', role: UserRole.JOB_SEEKER };

const mockJwtGuard: CanActivate = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  },
};

describe('Applications Feature (E2E)', () => {
  let app: INestApplication;

  // Фейкова in-memory база заявок
  const appsStore: Record<string, any> = {};
  let appIdCounter = 0;

  const mockApplicationRepo = {
    findOne: jest.fn(({ where }) => {
      const found = Object.values(appsStore).find((a: any) => {
        if (where.id) return a.id === where.id;
        if (where.applicantId && where.jobId)
          return a.applicantId === where.applicantId && a.jobId === where.jobId;
        return false;
      });
      return Promise.resolve(found ?? null);
    }),
    findAndCount: jest.fn(({ where, skip, take }) => {
      const all = Object.values(appsStore).filter((a: any) => {
        if (where.applicantId) return a.applicantId === where.applicantId;
        if (where.jobId) return a.jobId === where.jobId;
        return true;
      });
      return Promise.resolve([all.slice(skip, skip + take), all.length]);
    }),
    create: jest.fn((data) => ({ id: `app-${++appIdCounter}`, ...data })),
    save: jest.fn((app) => {
      appsStore[app.id] = app;
      return Promise.resolve(app);
    }),
  };

  const mockJobRepo = { findOne: jest.fn() };
  const mockUserRepo = { findOne: jest.fn().mockResolvedValue({ firstName: 'Тест', lastName: 'Юзер' }) };
  const mockJobsService = { incrementApplicationsCount: jest.fn().mockResolvedValue(undefined) };
  const mockNotificationsService = {
    sendNewApplicationNotification: jest.fn().mockResolvedValue(undefined),
    sendApplicationStatusUpdate: jest.fn().mockResolvedValue(undefined),
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

  // Валідні UUID для @IsUUID() перевірки
  const JOB_UUID = '550e8400-e29b-41d4-a716-446655440001';
  const JOB_UUID_2 = '550e8400-e29b-41d4-a716-446655440002';
  const JOB_UUID_GHOST = '550e8400-e29b-41d4-a716-446655440099';
  const JOB_UUID_EXPIRED = '550e8400-e29b-41d4-a716-446655440098';

  describe('Повний сценарій: подача заявки і перегляд', () => {
    it('1. POST /applications — job_seeker подає заявку (201)', async () => {
      mockUser = { userId: 'seeker-1', email: 'seeker@test.com', role: UserRole.JOB_SEEKER };
      mockJobRepo.findOne.mockResolvedValue({
        id: JOB_UUID, status: JobStatus.ACTIVE, applicationDeadline: null,
        employerId: 'emp-1', title: 'React Dev',
      });
      mockApplicationRepo.findOne.mockResolvedValueOnce(null);
      const app_entry = { id: 'app-1', jobId: JOB_UUID, applicantId: 'seeker-1', status: ApplicationStatus.PENDING };
      mockApplicationRepo.create.mockReturnValue(app_entry);
      mockApplicationRepo.save.mockResolvedValue(app_entry);
      mockUserRepo.findOne.mockResolvedValue({ firstName: 'Тест', lastName: 'Юзер' });

      const res = await request(app.getHttpServer())
        .post('/applications')
        .send({ jobId: JOB_UUID, coverLetter: 'Дуже хочу цю роботу!' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(ApplicationStatus.PENDING);
      expect(res.body.jobId).toBe(JOB_UUID);
    });

    it('2. POST /applications — відхиляє повторну заявку (400)', async () => {
      mockJobRepo.findOne.mockResolvedValue({
        id: JOB_UUID, status: JobStatus.ACTIVE, applicationDeadline: null,
      });
      mockApplicationRepo.findOne.mockResolvedValueOnce({
        id: 'app-1', status: ApplicationStatus.PENDING,
      });

      const res = await request(app.getHttpServer())
        .post('/applications')
        .send({ jobId: JOB_UUID });

      expect(res.status).toBe(400);
    });

    it('3. GET /applications/my — job_seeker бачить свої заявки', async () => {
      const myApps = [
        { id: 'app-1', jobId: JOB_UUID, applicantId: 'seeker-1', status: ApplicationStatus.PENDING },
        { id: 'app-2', jobId: JOB_UUID_2, applicantId: 'seeker-1', status: ApplicationStatus.REVIEWED },
      ];
      mockApplicationRepo.findAndCount.mockResolvedValue([myApps, 2]);

      const res = await request(app.getHttpServer()).get('/applications/my');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('4. POST /applications — 404 якщо вакансія не існує', async () => {
      mockJobRepo.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/applications')
        .send({ jobId: JOB_UUID_GHOST });

      expect(res.status).toBe(404);
    });

    it('5. POST /applications — 400 якщо дедлайн минув', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      mockJobRepo.findOne.mockResolvedValue({
        id: JOB_UUID_EXPIRED, status: JobStatus.ACTIVE,
        applicationDeadline: yesterday,
      });

      const res = await request(app.getHttpServer())
        .post('/applications')
        .send({ jobId: JOB_UUID_EXPIRED });

      expect(res.status).toBe(400);
    });
  });
});
