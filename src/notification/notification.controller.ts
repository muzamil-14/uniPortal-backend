import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Roles('teacher')
  @Post('send-message')
  sendMessage(@Request() req: any, @Body() dto: SendMessageDto) {
    return this.notificationService.sendMessage(req.user.userId, dto);
  }

  @Get()
  getNotifications(@Request() req: any) {
    return this.notificationService.getUserNotifications(req.user.userId);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.notificationService.getUnreadCount(req.user.userId);
  }

  @Patch(':id/read')
  markAsRead(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: any) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }
}
