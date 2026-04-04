import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  getConversations(@Request() req) {
    return this.chatService.getConversationList(req.user.userId);
  }

  @Get('conversations/:userId')
  @ApiOperation({ summary: 'Get conversation with user' })
  getConversation(
    @Request() req,
    @Param('userId') otherUserId: string,
    @Query('page') page: number = 1,
  ) {
    return this.chatService.getConversation(req.user.userId, otherUserId, page);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread messages count' })
  getUnreadCount(@Request() req) {
    return this.chatService.getUnreadCount(req.user.userId);
  }
}