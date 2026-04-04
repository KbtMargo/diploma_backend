import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Process('send')
  async handleSend(job: Job) {
    const { notificationId, userId, channels } = job.data;

    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!notification || !user) {
      this.logger.error(`Notification or user not found: ${notificationId}, ${userId}`);
      return;
    }

    // Send via email
    if (channels.includes(NotificationChannel.EMAIL) && user.email) {
      await this.sendEmail(user.email, notification.title, notification.content);
      notification.emailSentAt = new Date();
    }

    // Send via push (would integrate with FCM or similar)
    if (channels.includes(NotificationChannel.PUSH)) {
      await this.sendPush(user.id, notification.title, notification.content);
      notification.pushSentAt = new Date();
    }

    await this.notificationRepository.save(notification);
  }

  private async sendEmail(email: string, subject: string, content: string): Promise<void> {
    // Implement email sending logic
    this.logger.debug(`Sending email to ${email}: ${subject}`);
    // TODO: Integrate with email service (Nodemailer, SendGrid, etc.)
  }

  private async sendPush(userId: string, title: string, content: string): Promise<void> {
    // Implement push notification logic
    this.logger.debug(`Sending push to user ${userId}: ${title}`);
    // TODO: Integrate with FCM, APNS, or web push
  }
}