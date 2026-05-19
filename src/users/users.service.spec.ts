import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { Skill } from '../skills/entities/skill.entity';
import { UploadService } from '../common/upload.service';

// Мокуємо Google Generative AI щоб не робити зовнішні запити
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(),
  })),
}));

describe('UsersService (Unit — Mock Repository)', () => {
  let service: UsersService;

  // Фейкова замокована база даних (Mock Repository Pattern)
  const mockUserRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSkillRepo = {
    findBy: jest.fn().mockResolvedValue([]),
  };

  const mockUploadService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, def?: any) => {
      const map: Record<string, any> = { GEMINI_API_KEY: 'fake-key' };
      return map[key] ?? def;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Skill), useValue: mockSkillRepo },
        { provide: UploadService, useValue: mockUploadService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // --- findByEmail ---
  describe('findByEmail', () => {
    it('повертає користувача за email', async () => {
      const user = { id: 'uid-1', email: 'test@test.com', role: UserRole.JOB_SEEKER };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@test.com');

      expect(result?.email).toBe('test@test.com');
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
        relations: ['skills'],
      });
    });

    it('повертає null якщо користувача не знайдено', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nobody@test.com');

      expect(result).toBeNull();
    });
  });

  // --- findById ---
  describe('findById', () => {
    it('повертає користувача за ID', async () => {
      const user = { id: 'uid-2', firstName: 'Надія', lastName: 'Петренко', role: UserRole.JOB_SEEKER };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.findById('uid-2');

      expect(result.firstName).toBe('Надія');
    });

    it('кидає NotFoundException якщо користувача немає', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  // --- updateProfile ---
  describe('updateProfile', () => {
    it('оновлює профіль користувача', async () => {
      const user = { id: 'uid-3', firstName: 'Тарас', lastName: 'Шевченко', skills: [] };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockImplementation(async (u) => u);

      const result = await service.updateProfile('uid-3', { firstName: 'Богдан' } as any);

      expect(result.firstName).toBe('Богдан');
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
    });

    it('кидає NotFoundException при оновленні неіснуючого профілю', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('ghost', { firstName: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
