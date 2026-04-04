// backend/src/modules/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Notification, NotificationType, NotificationChannel } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createNotificationDto);
    const savedNotification = await this.notificationRepository.save(notification);

    // Queue for sending via other channels
    await this.notificationQueue.add('send', {
      notificationId: savedNotification,
      userId: createNotificationDto.userId,
      channels: createNotificationDto.channels,
    });

    return savedNotification;
  }

  async createBulk(notifications: CreateNotificationDto[]): Promise<Notification[]> {
    const created = await this.notificationRepository.save(notifications);
    
    for (const notification of created) {
      await this.notificationQueue.add('send', {
        notificationId: notification.id,
        userId: notification.userId,
        channels: notification.channels,
      });
    }

    return created;
  }

  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
    unreadOnly: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount: await this.getUnreadCount(userId),
      },
    };
  }

async markAsRead(id: string, userId: string): Promise<Notification | null> {
  const notification = await this.notificationRepository.findOne({
    where: { id, userId },
  });

  if (notification) {
    notification.isRead = true;
    await this.notificationRepository.save(notification);
  }

  return notification;
}

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.notificationRepository.delete({ id, userId });
  }

  async deleteAll(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId });
  }

  async sendJobAlert(userId: string, jobIds: string[]): Promise<void> {
    const notification = await this.create({
      userId,
      type: NotificationType.JOB_ALERT,
      title: 'New jobs match your preferences',
      content: `We found ${jobIds.length} new jobs that match your profile`,
      data: { jobIds },
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    });

    return;
  }

  async sendApplicationStatusUpdate(
    userId: string,
    jobTitle: string,
    status: string,
    applicationId: string,
  ): Promise<void> {
    await this.create({
      userId,
      type: NotificationType.APPLICATION_STATUS,
      title: `Application status updated: ${status}`,
      content: `Your application for "${jobTitle}" has been ${status}`,
      data: { applicationId, status },
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
    });
  }

  async sendNewApplicationNotification(
    employerId: string,
    jobTitle: string,
    applicantName: string,
    applicationId: string,
  ): Promise<void> {
    await this.create({
      userId: employerId,
      type: NotificationType.NEW_APPLICATION,
      title: 'New application received',
      content: `${applicantName} applied for ${jobTitle}`,
      data: { applicationId, jobTitle, applicantName },
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    });
  }

  async sendInterviewScheduled(
    userId: string,
    jobTitle: string,
    companyName: string,
    interviewDate: Date,
    applicationId: string,
  ): Promise<void> {
    const formattedDate = interviewDate.toLocaleString();
    await this.create({
      userId,
      type: NotificationType.INTERVIEW_SCHEDULED,
      title: 'Interview scheduled',
      content: `Your interview for ${jobTitle} at ${companyName} is scheduled for ${formattedDate}`,
      data: { applicationId, interviewDate: interviewDate.toISOString() },
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
    });
  }

  async cleanupOldNotifications(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.notificationRepository.delete({
      createdAt: LessThan(cutoffDate),
      isRead: true,
    });
  }
}