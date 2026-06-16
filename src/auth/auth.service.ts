import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from 'src/users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

async register(registerDto: RegisterDto) {
  const existingUser = await this.usersService.findByEmail(registerDto.email);
  if (existingUser) {
    throw new ConflictException('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(registerDto.password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const isStudentEmail = registerDto.email.toLowerCase().endsWith('.edu.ua');
  const user = this.userRepository.create({
    ...registerDto,
    password: hashedPassword,
    role: registerDto.role || UserRole.JOB_SEEKER,
    isActive: true,
    isEmailVerified: false,
    isStudentVerified: isStudentEmail,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
  });

  await this.userRepository.save(user);

  let emailSent = true;
  try {
    const verifyUrl = `${this.configService.get('FRONTEND_URL')}/auth/verify-email?token=${verificationToken}`;
    await this.emailService.sendVerificationEmail(user.email, user.firstName, verifyUrl);
  } catch {
    emailSent = false;
  }

  const isDev = this.configService.get('NODE_ENV', 'development') !== 'production';
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    isStudentVerified: user.isStudentVerified,
    createdAt: user.createdAt,
    message: emailSent
      ? 'Registration successful. Please check your email to verify your account.'
      : 'Registration successful. We could not send a verification email — please use "resend verification" on the login page.',
    ...(isDev && { emailVerificationToken: verificationToken }),
  };
}

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or already used verification token');
    }

    if (user.isEmailVerified) {
      return { message: 'Email already verified' };
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Verification token expired. Please request a new one.');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    const genericMsg = { message: 'If the email is registered and unverified, a new verification link has been sent' };
    if (!user || user.isEmailVerified) return genericMsg;

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userRepository.update(user.id, { emailVerificationToken: verificationToken, emailVerificationExpires: verificationExpires });

    const verifyUrl = `${this.configService.get('FRONTEND_URL')}/auth/verify-email?token=${verificationToken}`;
    await this.emailService.sendVerificationEmail(user.email, user.firstName, verifyUrl);
    return genericMsg;
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If email exists, password reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 година

    await this.userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${resetToken}`;
    await this.emailService.sendPasswordReset(user.email, user.firstName, resetUrl);

    return { message: 'Password reset link sent to your email' };
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }

  async resetPassword(token: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    if (user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async refreshToken(refreshToken: string) {
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenEntity.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = tokenEntity.user;
    const tokens = await this.generateTokens(user);

    tokenEntity.isRevoked = true;
    await this.refreshTokenRepository.save(tokenEntity);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, userId },
    });

    if (token) {
      token.isRevoked = true;
      await this.refreshTokenRepository.save(token);
    }

    return { message: 'Logged out successfully' };
  }

  async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES', '15m'),
        secret: this.configService.get('JWT_SECRET'),
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES', '7d'),
          secret: this.configService.get('JWT_REFRESH_SECRET'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async saveRefreshToken(userId: string, token: string) {
    const decoded = this.jwtService.decode(token) as any;
    const expiresAt = new Date(decoded.exp * 1000);

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token,
      expiresAt,
      isRevoked: false,
    });

    await this.refreshTokenRepository.save(refreshToken);
    return refreshToken;
  }
}