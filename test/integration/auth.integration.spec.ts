/**
 * Integration Test: AuthModule
 *
 * Тестуємо AuthService + AuthController разом (реальний NestJS модуль).
 * Зовнішні залежності (БД, email, redis) — замінені Mock Repository.
 * Це наближений до реальної роботи тест без запуску PostgreSQL.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AuthService } from '../../src/auth/auth.service';
import { AuthController } from '../../src/auth/auth.controller';
import { User, UserRole } from '../../src/users/entities/user.entity';
import { RefreshToken } from '../../src/auth/entities/refresh-token.entity';
import { UsersService } from '../../src/users/users.service';
import { EmailService } from '../../src/common/email/email.service';

describe('Auth Integration', () => {
  let app: INestApplication;
  let authService: AuthService;

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
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    verifyAsync: jest.fn(),
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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
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

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    authService = module.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  // --- реєстрація ---
  describe('POST /auth/register', () => {
    it('успішно реєструє нового користувача (201)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const newUser = {
        id: 'uid-1', email: 'mykola@test.com', firstName: 'Микола', lastName: 'Базів',
        role: UserRole.JOB_SEEKER, isActive: true, isEmailVerified: false,
        isStudentVerified: false, createdAt: new Date(),
      };
      mockUserRepo.create.mockReturnValue(newUser);
      mockUserRepo.save.mockResolvedValue(newUser);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'mykola@test.com', password: 'StrongP@ss1', firstName: 'Микола', lastName: 'Базів' });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('mykola@test.com');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('повертає 409 якщо email вже зайнятий', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'uid-x', email: 'exist@test.com' });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'exist@test.com', password: 'StrongP@ss1', firstName: 'Анна', lastName: 'Бондар' });

      expect(res.status).toBe(409);
    });
  });

  // --- логін ---
  describe('POST /auth/login', () => {
    it('повертає токени при правильних credentials', async () => {
      const hashed = await bcrypt.hash('MyPass123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'uid-2', email: 'user@test.com', password: hashed,
        role: UserRole.JOB_SEEKER, isActive: true,
      });
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'MyPass123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('повертає 401 при неправильному паролі', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'uid-3', email: 'user@test.com', password: hashed, isActive: true,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });
  });

  // --- прямий виклик сервісу ---
  describe('AuthService direct', () => {
    it('generateTokens формує пару access + refresh токенів', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-tkn')
        .mockResolvedValueOnce('refresh-tkn');

      const tokens = await authService.generateTokens({
        id: 'uid-4', email: 'x@x.com', role: UserRole.EMPLOYER,
      });

      expect(tokens.accessToken).toBe('access-tkn');
      expect(tokens.refreshToken).toBe('refresh-tkn');
    });
  });
});
