import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Skill } from 'src/skills/entities/skill.entity';
import { User } from 'src/users/entities/user.entity';
import { Job } from './entities/job.entity';
import { SavedJob } from './entities/saved-job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, SavedJob, Skill, User]),
    BullModule.registerQueue({
      name: 'jobs',
    }),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}