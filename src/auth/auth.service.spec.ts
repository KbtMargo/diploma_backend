import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from '../common/email/email.service';

describe('AuthService (Unit)', () => {
  let service: AuthService;

  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockRefreshTokenRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUsersService = { findByEmail: jest.fn() };

  const mockJwtService = {
    signAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, def?: any) => {
      const map: Record<string, any> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES: '15m',
        JWT_REFRESH_EXPIRES: '7d',
        FRONTEND_URL: 'http://localhost:3001',
      };
      return map[key] ?? def;
    }),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepo },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // --- validateUser ---
  describe('validateUser', () => {
    it('повертає обєкт без поля password при правильних credentials', async () => {
      const hashed = await bcrypt.hash('secret123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'uid-1', email: 'ivan@test.com', password: hashed, role: UserRole.JOB_SEEKER,
      });

      const result = await service.validateUser('ivan@test.com', 'secret123');

      expect(result).toBeDefined();
      expect(result.email).toBe('ivan@test.com');
      expect(result.password).toBeUndefined();
    });

    it('повертає null якщо пароль невірний', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'uid-1', email: 'ivan@test.com', password: hashed,
      });

      const result = await service.validateUser('ivan@test.com', 'wrong');

      expect(result).toBeNull();
    });
  });

  // --- login ---
  describe('login', () => {
    it('повертає accessToken і refreshToken при успішному вході', async () => {
      const hashed = await bcrypt.hash('pass123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'uid-1', email: 'user@test.com', password: hashed,
        role: UserRole.JOB_SEEKER, isActive: true, isEmailVerified: true,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-tkn')
        .mockResolvedValueOnce('refresh-tkn');
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      const result = await service.login({ email: 'user@test.com', password: 'pass123' });

      expect(result.accessToken).toBe('access-tkn');
      expect(result.refreshToken).toBe('refresh-tkn');
    });

    it('кидає UnauthorizedException якщо акаунт деактивовано', async () => {
      const hashed = await bcrypt.hash('pass123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'uid-2', email: 'banned@test.com', password: hashed,
        role: UserRole.JOB_SEEKER, isActive: false,
      });

      await expect(
        service.login({ email: 'banned@test.com', password: 'pass123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // --- register ---
  describe('register', () => {
    it('успішно реєструє нового користувача та надсилає email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const createdUser = {
        id: 'uid-3', email: 'new@test.com', firstName: 'Марія', lastName: 'Іваненко',
        role: UserRole.JOB_SEEKER, isActive: true,
        isEmailVerified: false, isStudentVerified: false, createdAt: new Date(),
      };
      mockUserRepo.create.mockReturnValue(createdUser);
      mockUserRepo.save.mockResolvedValue(createdUser);

      const result = await service.register({
        email: 'new@test.com', password: 'StrongP@ss1',
        firstName: 'Марія', lastName: 'Іваненко',
      });

      expect(result.email).toBe('new@test.com');
      expect(result.message).toContain('Registration successful');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('кидає ConflictException якщо email вже використовується', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'uid-4', email: 'exist@test.com' });

      await expect(
        service.register({
          email: 'exist@test.com', password: 'StrongP@ss1',
          firstName: 'А', lastName: 'Б',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // --- verifyEmail ---
  describe('verifyEmail', () => {
    it('кидає BadRequestException для невалідного токену', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });

    it('кидає BadRequestException якщо токен прострочений', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'uid-5',
        emailVerificationExpires: new Date(Date.now() - 1000),
      });

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(BadRequestException);
    });
  });
});
