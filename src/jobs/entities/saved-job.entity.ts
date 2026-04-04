import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Unique, Column } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Job } from './job.entity';

@Entity('saved_jobs')
@Unique(['userId', 'jobId'])
export class SavedJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.savedJobs, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Job, (job) => job.savedByUsers, { onDelete: 'CASCADE' })
  job: Job;

  @Column()
  jobId: string;

  @CreateDateColumn()
  savedAt: Date;
}