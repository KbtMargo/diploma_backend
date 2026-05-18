import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Job } from '../../jobs/entities/job.entity';
import { CompanyReview } from './company-review.entity';

export enum CompanySize {
  SOLO = '1-10',
  SMALL = '11-50',
  MEDIUM = '51-200',
  LARGE = '201-500',
  ENTERPRISE = '500+',
}

export enum CompanyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  VERIFIED = 'verified',
}

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn()
  owner: User;

  @Column()
  ownerId: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  shortDescription: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  foundedYear: number;

  @Column({
    type: 'enum',
    enum: CompanySize,
    nullable: true,
  })
  size: CompanySize;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.PENDING,
  })
  status: CompanyStatus;

  @Column('text', { array: true, nullable: true })
  specialties: string[];

  @Column('simple-json', { nullable: true })
  socialLinks: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    github?: string;
  };

  @Column('simple-json', { nullable: true })
  locations: {
    country: string;
    city: string;
    address?: string;
    isHeadquarters: boolean;
  }[];

  @Column({ default: 0 })
  totalEmployees: number;

  @Column({ default: 0 })
  totalJobsPosted: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewsCount: number;

  @Column({ nullable: true })
  verificationDocumentUrl: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  verifiedBy: string;

  @OneToMany(() => CompanyReview, (review) => review.company)
  reviews: CompanyReview[];

  @OneToMany(() => Job, (job) => job.employer)
  jobs: Job[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}