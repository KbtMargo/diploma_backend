import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);

      this.logger.log(`User ${payload.sub} connected`);

      // Приєднати до особистої кімнати
      client.join(`user_${payload.sub}`);

      // Відправити кількість непрочитаних
      const unreadCount = await this.chatService.getUnreadCount(payload.sub);
      client.emit('unread_count', { count: unreadCount });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.connectedUsers.delete(client.data.userId);
      this.logger.log(`User ${client.data.userId} disconnected`);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string; type?: string; tempId?: string },
  ) {
    const senderId = client.data.userId;
    if (!senderId) return;

    const message = await this.chatService.sendMessage(senderId, {
      receiverId: data.receiverId,
      content: data.content,
      type: data.type as any,
    });

    // Echo tempId back to sender so client can replace optimistic message
    client.emit('new_message', { ...message, tempId: data.tempId });
    this.server.to(`user_${data.receiverId}`).emit('new_message', message);

    // Оновити лічильник непрочитаних у отримувача
    const receiverUnread = await this.chatService.getUnreadCount(data.receiverId);
    this.server.to(`user_${data.receiverId}`).emit('unread_count', { count: receiverUnread });
    this.server.to(`user_${data.receiverId}`).emit('notification_update');

    // Зберегти сповіщення в БД
    this.notificationsService
      .sendMessageNotification(data.receiverId, `Нове повідомлення`, data.content)
      .catch(() => {});

    return message;
  }

  @SubscribeMessage('get_conversation')
  async handleGetConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { otherUserId: string; page?: number },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const conversation = await this.chatService.getConversation(
      userId,
      data.otherUserId,
      data.page || 1,
    );

    client.emit('conversation', conversation);

    // Notify senders that their messages were read when conversation loaded
    const roomId = this.chatService.getRoomId(userId, data.otherUserId);
    for (const senderId of conversation.markedReadFrom) {
      this.server.to(`user_${senderId}`).emit('messages_read', { roomId, readBy: userId });
    }

    return conversation;
  }

  @SubscribeMessage('get_conversations')
  async handleGetConversations(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    const conversations = await this.chatService.getConversationList(userId);
    client.emit('conversations', conversations);
    return conversations;
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const senderIds = await this.chatService.markAsRead(data.roomId, userId);
    client.emit('marked_read', { roomId: data.roomId });

    // Notify all senders that their messages were read
    for (const senderId of senderIds) {
      this.server.to(`user_${senderId}`).emit('messages_read', { roomId: data.roomId, readBy: userId });
    }

    const unreadCount = await this.chatService.getUnreadCount(userId);
    this.server.to(`user_${userId}`).emit('unread_count', { count: unreadCount });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    this.server.to(`user_${data.receiverId}`).emit('user_typing', {
      userId,
      isTyping: data.isTyping,
    });
  }

  // Публічний метод для відправки сповіщень з інших сервісів
  sendNotificationToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }
}