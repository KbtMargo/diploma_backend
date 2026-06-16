import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../common/email/email.service';

@Processor('notifications')
@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  @Process('send')
  async handleSend(job: Job) {
    const { notificationId, userId, channels } = job.data;

    // Guard against old bug where full object was passed instead of id
    const id = typeof notificationId === 'string' ? notificationId : notificationId?.id;

    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!notification || !user) {
      this.logger.error(`Notification or user not found: ${id}, ${userId}`);
      return;
    }

    if (channels.includes(NotificationChannel.EMAIL) && user.email) {
      try {
        await this.sendEmail(user, notification);
        notification.emailSentAt = new Date();
      } catch (err) {
        this.logger.error(`Failed to send email for notification ${id}`, err);
      }
    }

    if (channels.includes(NotificationChannel.PUSH)) {
      this.sendPush(user.id, notification.title, notification.content);
      notification.pushSentAt = new Date();
    }

    await this.notificationRepository.save(notification);
  }

  private async sendEmail(user: User, notification: Notification): Promise<void> {
    const { type, data, title, content } = notification;
    const { email, firstName } = user;

    switch (type) {
      case NotificationType.APPLICATION_STATUS:
        await this.emailService.sendApplicationStatus(
          email,
          firstName,
          data?.jobTitle || title,
          data?.status || '',
          data?.applicationId || '',
        );
        break;

      case NotificationType.NEW_APPLICATION:
        await this.emailService.sendNewApplication(
          email,
          firstName,
          data?.jobTitle || '',
          data?.applicantName || '',
          data?.applicationId || '',
        );
        break;

      case NotificationType.INTERVIEW_SCHEDULED:
        await this.emailService.sendInterviewScheduled(
          email,
          firstName,
          data?.jobTitle || '',
          data?.companyName || '',
          data?.interviewDate ? new Date(data.interviewDate) : new Date(),
          data?.meetingLink,
        );
        break;

      case NotificationType.MESSAGE:
        await this.emailService.sendNewMessage(
          email,
          firstName,
          data?.senderName || 'Користувач StartWay',
          data?.preview || content,
        );
        break;

      default:
        await this.emailService.sendGenericNotification(email, firstName, title, content);
    }

    this.logger.log(`Email sent to ${email} for notification ${notification.id} (${type})`);
  }

  private sendPush(userId: string, title: string, content: string): void {
    // FCM / web push — placeholder for future integration
    this.logger.debug(`Push stub: user=${userId} title=${title}`);
  }
}
