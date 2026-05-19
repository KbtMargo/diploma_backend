import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApplicationsService } from './applications.service';
import { Application, ApplicationStatus } from './entities/application.entity';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ApplicationsService (Unit)', () => {
  let service: ApplicationsService;

  const mockApplicationRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJobRepo = { findOne: jest.fn() };
  const mockUserRepo = { findOne: jest.fn() };

  const mockJobsService = {
    incrementApplicationsCount: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsService = {
    sendNewApplicationNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: getRepositoryToken(Application), useValue: mockApplicationRepo },
        { provide: getRepositoryToken(Job), useValue: mockJobRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JobsService, useValue: mockJobsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  // --- create ---
  describe('create', () => {
    it('успішно подає заявку на активну вакансію', async () => {
      const job = { id: 'job-1', status: JobStatus.ACTIVE, applicationDeadline: null, employerId: 'emp-1', title: 'Dev' };
      const app = { id: 'app-1', jobId: 'job-1', applicantId: 'user-1', status: ApplicationStatus.PENDING };

      mockJobRepo.findOne.mockResolvedValue(job);
      mockApplicationRepo.findOne.mockResolvedValue(null);
      mockApplicationRepo.create.mockReturnValue(app);
      mockApplicationRepo.save.mockResolvedValue(app);
      mockUserRepo.findOne.mockResolvedValue({ firstName: 'Олег', lastName: 'Мороз' });

      const result = await service.create({ jobId: 'job-1' }, 'user-1');

      expect(result.id).toBe('app-1');
      expect(result.status).toBe(ApplicationStatus.PENDING);
      expect(mockJobsService.incrementApplicationsCount).toHaveBeenCalledWith('job-1');
    });

    it('кидає NotFoundException якщо вакансія не існує', async () => {
      mockJobRepo.findOne.mockResolvedValue(null);

      await expect(service.create({ jobId: 'ghost' }, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('кидає BadRequestException якщо вакансія не активна', async () => {
      mockJobRepo.findOne.mockResolvedValue({ id: 'job-1', status: JobStatus.FILLED });

      await expect(service.create({ jobId: 'job-1' }, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('кидає BadRequestException якщо вже є активна заявка', async () => {
      mockJobRepo.findOne.mockResolvedValue({
        id: 'job-1', status: JobStatus.ACTIVE, applicationDeadline: null,
      });
      mockApplicationRepo.findOne.mockResolvedValue({
        id: 'app-existing', status: ApplicationStatus.PENDING,
      });

      await expect(service.create({ jobId: 'job-1' }, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  // --- findAllForApplicant ---
  describe('findAllForApplicant', () => {
    it('повертає заявки з мета-даними пагінації', async () => {
      const apps = [{ id: 'a1' }, { id: 'a2' }];
      mockApplicationRepo.findAndCount.mockResolvedValue([apps, 2]);

      const result = await service.findAllForApplicant('user-1', 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});
