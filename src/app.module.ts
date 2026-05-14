import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';
import { CompaniesModule } from './companies/companies.module';
import { SkillsModule } from './skills/skills.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';

import { User } from './users/entities/user.entity';
import { Job } from './jobs/entities/job.entity';
import { SavedJob } from './jobs/entities/saved-job.entity';
import { Application } from './applications/entities/application.entity';
import { Company } from './companies/entities/company.entity';
import { CompanyReview } from './companies/entities/company-review.entity';
import { Skill } from './skills/entities/skill.entity';
import { SkillCategory } from './skills/entities/skill-category.entity';
import { Notification } from './notifications/entities/notification.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { AuditLog } from './admin/entities/audit-log.entity';
import { Message } from './chat/entities/message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {
    const isProduction = configService.get('NODE_ENV') === 'production';

    return {
      type: 'postgres',
      url: configService.get<string>('DATABASE_URL'),
      ssl: isProduction
        ? { rejectUnauthorized: false }
        : false,

      entities: [
        User,
        RefreshToken,
        Job,
        SavedJob,
        Application,
        Company,
        CompanyReview,
        Skill,
        SkillCategory,
        Notification,
        AuditLog,
        Message,
      ],

      synchronize: !isProduction,
      logging: !isProduction,
      migrations: ['dist/database/migrations/*.js'],
      migrationsRun: false,
    };
  },
  inject: [ConfigService],
}),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    BullModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    redis: {
      host: new URL(
        configService.get<string>('REDIS_URL')!,
      ).hostname,

      port: Number(
        new URL(
          configService.get<string>('REDIS_URL')!,
        ).port,
      ),

      password: new URL(
        configService.get<string>('REDIS_URL')!,
      ).password,
    },
  }),
}),

    AuthModule,
    UsersModule,
    JobsModule,
    ApplicationsModule,
    CompaniesModule,
    SkillsModule,
    NotificationsModule,
    AnalyticsModule,
    AdminModule,
    ChatModule,
    AiModule,
  ],
})
export class AppModule {}