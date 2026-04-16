import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_BLOCKED = 'user_blocked',
  JOB_CREATED = 'job_created',
  JOB_UPDATED = 'job_updated',
  JOB_DELETED = 'job_deleted',
  JOB_MODERATED = 'job_moderated',
  COMPANY_CREATED = 'company_created',
  COMPANY_UPDATED = 'company_updated',
  COMPANY_VERIFIED = 'company_verified',
  APPLICATION_REVIEWED = 'application_reviewed',
  SETTINGS_CHANGED = 'settings_changed',
}

@Entity('audit_logs')
@Index(['userId', 'action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userEmail: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ nullable: true })
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column('jsonb', { nullable: true })
  oldData: any;

  @Column('jsonb', { nullable: true })
  newData: any;

  @Column('inet', { nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;
}