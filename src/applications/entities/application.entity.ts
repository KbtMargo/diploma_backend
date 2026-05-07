import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Job } from '../../jobs/entities/job.entity';

export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEWED = 'interviewed',
  OFFERED = 'offered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.applications, { onDelete: 'CASCADE' })
  applicant: User;

  @Column()
  applicantId: string;

  @ManyToOne(() => Job, (job) => job.applications, { onDelete: 'CASCADE' })
  job: Job;

  @Column()
  jobId: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Column('text', { nullable: true })
  coverLetter: string;

  @Column({ nullable: true })
  expectedSalary: number;

  @Column({ nullable: true })
  expectedSalaryCurrency: string;

  @Column({ nullable: true })
  availableStartDate: Date;

  @Column('jsonb', { nullable: true })
  attachments: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: Date;
  }[];

  @Column('jsonb', { nullable: true })
  answers: {
    questionId: string;
    question: string;
    answer: string;
  }[];

  @Column({ nullable: true })
  employerNotes: string;

  @Column({ nullable: true })
  rating: number;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ nullable: true })
  reviewedAt: Date;

  @Column('jsonb', { nullable: true })
  interviewDetails: {
    scheduledAt: Date;
    duration: number;
    type: 'online' | 'offline' | 'phone';
    location?: string;
    meetingLink?: string;
    notes?: string;
    reminderSent: boolean;
    feedback?: string;
  };

  @Column('jsonb', { nullable: true })
  aiAnalysis: {
    score: number;
    recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
    strengths: string[];
    gaps: string[];
    summary: string;
  } | null;

  @Column({ nullable: true })
  aiAnalyzedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}