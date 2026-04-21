import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Job } from 'src/jobs/entities/job.entity';
import { Application } from 'src/applications/entities/application.entity';
import { SavedJob } from 'src/jobs/entities/saved-job.entity';
import { Skill } from 'src/skills/entities/skill.entity';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';
import { Company } from 'src/companies/entities/company.entity';

export enum UserRole {
  JOB_SEEKER = 'job_seeker',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  resumeUrl: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.JOB_SEEKER })
  role: UserRole;

  @Column({ nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  // Email verification
  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ nullable: true })
  emailVerificationExpires: Date;

  // Password reset
  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  @Column('text', { array: true, nullable: true })
  preferredCountries: string[];

  @Column('text', { array: true, nullable: true })
  preferredJobTypes: string[];

  @Column('text', { array: true, nullable: true })
  languages: string[];

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'jsonb', nullable: true })
  education: {
    institution: string;
    degree: string;
    field: string;
    startDate: Date;
    endDate: Date;
    grade?: string;
    description?: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  workExperience: {
    company: string;
    position: string;
    startDate: Date;
    endDate?: Date;
    current: boolean;
    description: string;
    achievements?: string[];
  }[];

  @Column({ type: 'jsonb', nullable: true })
  portfolio: {
    title: string;
    description: string;
    url?: string;
    fileUrl?: string;
    fileType?: string;
  }[];

  @ManyToMany(() => Skill)
  @JoinTable({
    name: 'user_skills',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skill_id', referencedColumnName: 'id' },
  })
  skills: Skill[];

  @OneToMany(() => Job, (job) => job.employer)
  jobs: Job[];

  @OneToMany(() => Application, (application) => application.applicant)
  applications: Application[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => SavedJob, (savedJob) => savedJob.user)
  savedJobs: SavedJob[];

  @OneToOne(() => Company, (company) => company.owner)
  company: Company;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}