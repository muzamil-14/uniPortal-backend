import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class NotificationRealtimeService {
  private server: Server | null = null;

  registerServer(server: Server) {
    this.server = server;
  }

  emitUnreadCount(userId: number, count: number) {
    if (!this.server) return;
    this.server.to(`user_${userId}`).emit('unreadCountUpdated', { count });
  }
}
