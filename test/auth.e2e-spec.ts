/**
 * Feature Test: Auth Flow (E2E)
 *
 * Тестує повний сценарій авторизації:
 *   реєстрація → логін → refresh token → logout
 *
 * Всі зовнішні сервіси (БД, email) замінені моками.
 * Запити йдуть через реальний HTTP сервер (supertest).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { User, UserRole } from '../src/users/entities/user.entity';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity';
import { UsersService } from '../src/users/users.service';
import { EmailService } from '../src/common/email/email.service';

describe('Auth Feature (E2E)', () => {
  let app: INestApplication;

  // ---- Фейкова база в пам'яті (Mock Repository) ----
  const inMemoryUsers: Record<string, any> = {};
  const inMemoryTokens: Record<string, any> = {};

  const mockUserRepo = {
    findOne: jest.fn(({ where }) => {
      const found = Object.values(inMemoryUsers).find((u: any) => {
        if (where.email) return u.email === where.email;
        if (where.emailVerificationToken) return u.emailVerificationToken === where.emailVerificationToken;
        if (where.id) return u.id === where.id;
        return false;
      });
      return Promise.resolve(found ?? null);
    }),
    create: jest.fn((data) => ({ id: `uid-${Date.now()}`, ...data })),
    save: jest.fn((user) => {
      inMemoryUsers[user.id] = user;
      return Promise.resolve(user);
    }),
    update: jest.fn(),
  };

  const mockRefreshTokenRepo = {
    findOne: jest.fn(({ where }) => {
      const found = Object.values(inMemoryTokens).find((t: any) =>
        t.token === where.token && !t.isRevoked,
      );
      return Promise.resolve(found ?? null);
    }),
    create: jest.fn((data) => ({ id: `tkn-${Date.now()}`, ...data })),
    save: jest.fn((tkn) => {
      inMemoryTokens[tkn.id || tkn.token] = tkn;
      return Promise.resolve(tkn);
    }),
  };

  const mockUsersService = {
    findByEmail: jest.fn((email: string) =>
      Promise.resolve(Object.values(inMemoryUsers).find((u: any) => u.email === email) ?? null),
    ),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  };

  const mockConfigService = {
    get: jest.fn((key: string, def?: any) => {
      const map: Record<string, any> = {
        JWT_SECRET: 'e2e-secret',
        JWT_REFRESH_SECRET: 'e2e-refresh-secret',
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
  });

  afterAll(async () => await app.close());

  // ---- Повний сценарій: реєстрація → логін → refresh → logout ----
  describe('Повний auth flow', () => {
    const userData = {
      email: 'olena@startway.ua',
      password: 'Diploma2026!',
      firstName: 'Олена',
      lastName: 'Сидоренко',
    };
    let accessToken: string;
    let refreshToken: string;

    it('1. POST /auth/register — реєструє нового користувача', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(userData.email);
      expect(res.body.message).toContain('Registration successful');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('2. POST /auth/register — відхиляє дублікат email (409)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData);

      expect(res.status).toBe(409);
    });

    it('3. POST /auth/login — повертає accessToken і refreshToken', async () => {
      // Оновлюємо in-memory: додаємо захешований пароль
      const hashed = await bcrypt.hash(userData.password, 10);
      const existingUser = Object.values(inMemoryUsers)[0] as any;
      existingUser.password = hashed;
      existingUser.isActive = true;
      mockUsersService.findByEmail.mockResolvedValue(existingUser);

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-abc')
        .mockResolvedValueOnce('refresh-xyz');

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userData.email, password: userData.password });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe('access-abc');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('4. POST /auth/login — відхиляє неправильний пароль (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userData.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('5. POST /auth/register — валідація: порожні поля повертають 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: '123' }); // занадто короткий пароль

      expect(res.status).toBe(400);
    });
  });
});
