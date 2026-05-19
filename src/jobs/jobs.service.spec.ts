import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { Job, JobStatus, JobType } from './entities/job.entity';
import { SavedJob } from './entities/saved-job.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Application } from '../applications/entities/application.entity';
import { Skill } from '../skills/entities/skill.entity';
import { Company } from '../companies/entities/company.entity';

// Фейковий QueryBuilder — Mock Database для jobs
const makeQb = (jobs: any[] = [], total = 0) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([jobs, total]),
});

describe('JobsService (Unit)', () => {
  let service: JobsService;

  const mockJobsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(),
  };

  const mockSavedJobsRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  const mockUsersRepo = { findOne: jest.fn() };
  const mockApplicationsRepo = { findOne: jest.fn() };
  const mockSkillRepo = { findBy: jest.fn().mockResolvedValue([]) };
  const mockCompanyRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJobsRepo.createQueryBuilder.mockReturnValue(makeQb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(Job), useValue: mockJobsRepo },
        { provide: getRepositoryToken(SavedJob), useValue: mockSavedJobsRepo },
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: getRepositoryToken(Application), useValue: mockApplicationsRepo },
        { provide: getRepositoryToken(Skill), useValue: mockSkillRepo },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  // --- create ---
  describe('create', () => {
    it('успішно створює вакансію і зберігає в репозиторій', async () => {
      const dto = { title: 'Junior JS Developer', jobType: JobType.FULL_TIME };
      const fakeJob = { id: 'job-1', ...dto, employerId: 'emp-1', status: JobStatus.ACTIVE };

      mockJobsRepo.create.mockReturnValue(fakeJob);
      mockJobsRepo.save.mockResolvedValue(fakeJob);

      const result = await service.create(dto as any, 'emp-1');

      expect(result.id).toBe('job-1');
      expect(mockJobsRepo.save).toHaveBeenCalledTimes(1);
    });

    it('автоматично встановлює isPaid=true якщо є salaryMin', async () => {
      const dto = { title: 'Senior Dev', salaryMin: 3000 };

      // create повертає свій аргумент щоб зберегти isPaid яке виставив сервіс
      mockJobsRepo.create.mockImplementation((data) => ({ ...data }));
      mockJobsRepo.save.mockImplementation(async (j) => j);

      const result = await service.create(dto as any, 'emp-1');

      expect(result.isPaid).toBe(true);
    });
  });

  // --- findAll ---
  describe('findAll', () => {
    it('повертає порожній список і total=0 якщо вакансій немає', async () => {
      mockJobsRepo.createQueryBuilder.mockReturnValue(makeQb([], 0));

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('повертає список вакансій з правильною пагінацією', async () => {
      const fakeJobs = [
        { id: 'j1', title: 'Frontend Dev' },
        { id: 'j2', title: 'Backend Dev' },
      ];
      mockJobsRepo.createQueryBuilder.mockReturnValue(makeQb(fakeJobs, 2));

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  // --- findOne ---
  describe('findOne', () => {
    it('повертає вакансію за існуючим ID', async () => {
      const job = { id: 'job-1', title: 'QA Engineer', status: JobStatus.ACTIVE };
      mockJobsRepo.findOne.mockResolvedValue(job);

      const result = await service.findOne('job-1');

      expect(result.title).toBe('QA Engineer');
    });

    it('кидає NotFoundException для неіснуючого ID', async () => {
      mockJobsRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  // --- update ---
  describe('update', () => {
    it('кидає ForbiddenException якщо не власник вакансії', async () => {
      const job = { id: 'job-1', employerId: 'emp-owner', title: 'Dev', requiredSkills: [] };
      mockJobsRepo.findOne.mockResolvedValue(job);

      await expect(
        service.update('job-1', { title: 'Hacked' } as any, 'other-user', UserRole.JOB_SEEKER),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
