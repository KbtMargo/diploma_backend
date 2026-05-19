import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async sendMessage(senderId: string, dto: SendMessageDto): Promise<Message> {
    const roomId = this.getRoomId(senderId, dto.receiverId);

    const message = this.messageRepository.create({
      senderId,
      receiverId: dto.receiverId,
      roomId,
      content: dto.content,
      type: dto.type,
      fileUrl: dto.fileUrl,
    });

    return await this.messageRepository.save(message);
  }

  async getConversation(
    userId: string,
    otherUserId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const roomId = this.getRoomId(userId, otherUserId);
    const skip = (page - 1) * limit;

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { roomId },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const markedReadFrom = await this.markAsRead(roomId, userId);

    return {
      data: messages.reverse(),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      markedReadFrom,
    };
  }

  async getConversationList(userId: string) {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .where('message.senderId = :userId OR message.receiverId = :userId', { userId })
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    // Групуємо по roomId — беремо останнє повідомлення з кожної розмови
    const conversations = new Map<string, any>();

    for (const message of messages) {
      if (!conversations.has(message.roomId)) {
        const otherUser = message.senderId === userId ? message.receiver : message.sender;
        const unreadCount = await this.messageRepository.count({
          where: { roomId: message.roomId, receiverId: userId, isRead: false },
        });

        conversations.set(message.roomId, {
          roomId: message.roomId,
          otherUser,
          lastMessage: message,
          unreadCount,
        });
      }
    }

    return Array.from(conversations.values());
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.messageRepository.count({
      where: { receiverId: userId, isRead: false },
    });
  }

  async markAsRead(roomId: string, userId: string): Promise<string[]> {
    const unread = await this.messageRepository.find({
      where: { roomId, receiverId: userId, isRead: false },
      select: ['senderId'],
    });
    if (unread.length === 0) return [];
    await this.messageRepository.update(
      { roomId, receiverId: userId, isRead: false },
      { isRead: true },
    );
    return [...new Set(unread.map((m) => m.senderId))];
  }

  getRoomId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }
}