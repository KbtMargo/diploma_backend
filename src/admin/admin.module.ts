import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';
import { Company } from '../companies/entities/company.entity';
import { Application } from '../applications/entities/application.entity';
import { Skill } from '../skills/entities/skill.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Job, Company, Application, Skill, AuditLog]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}