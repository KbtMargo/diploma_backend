import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { CompanyReview } from './entities/company-review.entity';
import { User } from '../users/entities/user.entity';

describe('CompaniesService', () => {
  let service: CompaniesService;

  const mockRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: getRepositoryToken(Company), useValue: { ...mockRepo } },
        { provide: getRepositoryToken(CompanyReview), useValue: { ...mockRepo } },
        { provide: getRepositoryToken(User), useValue: { ...mockRepo } },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
