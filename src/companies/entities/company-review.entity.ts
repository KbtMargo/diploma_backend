import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from '../../users/entities/user.entity';

@Entity('company_reviews')
export class CompanyReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, (company) => company.reviews, { onDelete: 'CASCADE' })
  company: Company;

  @Column()
  companyId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'int', default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  workLifeBalance: number;

  @Column({ type: 'int', default: 0 })
  salaryBenefits: number;

  @Column({ type: 'int', default: 0 })
  careerOpportunities: number;

  @Column({ type: 'int', default: 0 })
  management: number;

  @Column({ type: 'int', default: 0 })
  culture: number;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  employmentDuration: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isRecommended: boolean;

  @Column('simple-json', { nullable: true })
  pros: string[];

  @Column('simple-json', { nullable: true })
  cons: string[];

  @Column({ nullable: true })
  reply: string;

  @Column({ nullable: true })
  repliedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}