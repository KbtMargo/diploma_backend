import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';
import { Company } from '../companies/entities/company.entity';
import { Application } from '../applications/entities/application.entity';
import { Skill } from '../skills/entities/skill.entity';
import { AuditLog } from './entities/audit-log.entity';

describe('AdminService', () => {
  let service: AdminService;

  const mockRepo = { find: jest.fn(), findOne: jest.fn(), findAndCount: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: { ...mockRepo } },
        { provide: getRepositoryToken(Job), useValue: { ...mockRepo } },
        { provide: getRepositoryToken(Company), useValue: { ...mockRepo } },
        { provide: getRepositoryToken(Application), useValue: { ...mockRepo } },
        { provide: getRepositoryToken(Skill), useValue: { ...mockRepo } },
        { provide: getRepositoryToken(AuditLog), useValue: { ...mockRepo } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
