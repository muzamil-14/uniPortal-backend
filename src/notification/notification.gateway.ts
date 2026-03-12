import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { NotificationRealtimeService } from './notification-realtime.service';

@WebSocketGateway({
  cors: { origin: 'http://localhost:3001', credentials: true },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, { userId: number; role: string }>();

  constructor(
    private configService: ConfigService,
    private notificationRealtimeService: NotificationRealtimeService,
  ) {}

  afterInit(server: Server) {
    this.notificationRealtimeService.registerServer(server);
  }

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace(
          'Bearer ',
          '',
        );
      if (!token) {
        client.disconnect();
        return;
      }
      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'defaultSecretChangeMe',
      );
      const payload = jwt.verify(token, secret) as unknown as {
        sub: number;
        role: string;
      };
      this.connectedUsers.set(client.id, {
        userId: payload.sub,
        role: payload.role,
      });
      client.join(`user_${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
  }
}
