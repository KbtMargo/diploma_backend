import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Application } from 'src/applications/entities/application.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { SavedJob } from './saved-job.entity';

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  INTERNSHIP = 'internship',
  REMOTE = 'remote',
  FREELANCE = 'freelance',
  CONTRACT = 'contract',
}

export enum JobStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FILLED = 'filled',
  EXPIRED = 'expired',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export enum ExperienceLevel {
  INTERN = 'intern',
  JUNIOR = 'junior',
  MIDDLE = 'middle',
  SENIOR = 'senior',
  LEAD = 'lead',
  EXECUTIVE = 'executive',
}

export enum WorkFormat {
  OFFICE = 'office',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  requirements: string;

  @Column('text', { nullable: true })
  responsibilities: string;

  @Column('text', { nullable: true })
  benefits: string;

  @Column({ type: 'enum', enum: JobType, default: JobType.FULL_TIME })
  jobType: JobType;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PENDING })
  status: JobStatus;

  @Column({ type: 'enum', enum: ExperienceLevel, nullable: true })
  experienceLevel: ExperienceLevel;

  @Column({ type: 'enum', enum: WorkFormat, default: WorkFormat.OFFICE })
  workFormat: WorkFormat;

  @Column()
  country: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  latitude: number;

  @Column({ nullable: true })
  longitude: number;

  @Column({ nullable: true })
  salaryMin: number;

  @Column({ nullable: true })
  salaryMax: number;

  @Column({ nullable: true })
  salaryCurrency: string;

  @Column({ default: false })
  isSalaryNegotiable: boolean;

  @Column({ default: false })
  isRemote: boolean;

  @Column('date', { nullable: true })
  applicationDeadline: Date;

  @Column({ nullable: true })
  educationLevel: string;

  @Column('text', { array: true, nullable: true })
  requiredLanguages: string[];

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  applicationsCount: number;

  @Column({ nullable: true })
  vacanciesCount: number;

  @Column({ nullable: true })
  category: string;

  @Column('text', { array: true, nullable: true })
  tags: string[];

  @Column({ nullable: true })
  externalLink: string;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: false })
  isUrgent: boolean;

  @Column({ nullable: true })
  publishedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @ManyToOne(() => User, (user) => user.jobs, { onDelete: 'CASCADE' })
  employer: User;

  @Column()
  employerId: string;

  @OneToMany(() => Application, (application) => application.job)
  applications: Application[];

  @ManyToMany(() => Skill)
  @JoinTable({
    name: 'job_skills',
    joinColumn: { name: 'job_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skill_id', referencedColumnName: 'id' },
  })
  requiredSkills: Skill[];

  @OneToMany(() => SavedJob, (savedJob) => savedJob.job)
  savedByUsers: SavedJob[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}