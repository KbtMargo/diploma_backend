import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  JOB_ALERT = 'job_alert',
  APPLICATION_STATUS = 'application_status',
  NEW_APPLICATION = 'new_application',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  MESSAGE = 'message',
  SYSTEM = 'system',
  DEADLINE_REMINDER = 'deadline_reminder',
  PROFILE_VIEW = 'profile_view',
}

export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column('jsonb', { nullable: true })
  data: {
    jobId?: string;
    applicationId?: string;
    companyId?: string;
    url?: string;
    imageUrl?: string;
    [key: string]: any;
  };

  @Column({ default: false })
  isRead: boolean;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    array: true,
    default: [NotificationChannel.IN_APP],
  })
  channels: NotificationChannel[];

  @Column({ nullable: true })
  emailSentAt: Date;

  @Column({ nullable: true })
  pushSentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}