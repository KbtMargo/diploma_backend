import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Skill } from 'src/skills/entities/skill.entity';
import { User } from 'src/users/entities/user.entity';
import { Job } from './entities/job.entity';
import { SavedJob } from './entities/saved-job.entity';
import { Application } from 'src/applications/entities/application.entity';
import { ApplicationsModule } from 'src/applications/applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, SavedJob, Skill, User, Application]),
    BullModule.registerQueue({
      name: 'jobs',
    }),
    forwardRef(() => ApplicationsModule),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}