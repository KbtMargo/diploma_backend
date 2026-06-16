import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SkillsService } from './skills.service';
import { Skill } from './entities/skill.entity';
import { SkillCategory } from './entities/skill-category.entity';

describe('SkillsService', () => {
  let service: SkillsService;

  const mockRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: getRepositoryToken(Skill), useValue: { ...mockRepo } },
        { provide: getRepositoryToken(SkillCategory), useValue: { ...mockRepo } },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
