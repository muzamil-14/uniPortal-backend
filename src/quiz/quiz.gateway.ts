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
import { QuizService } from './quiz.service';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { QuizRealtimeService } from './quiz-realtime.service';

@WebSocketGateway({
  cors: { origin: 'http://localhost:3001', credentials: true },
  namespace: '/quiz',
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, { userId: number; role: string }>();

  constructor(
    private quizService: QuizService,
    private configService: ConfigService,
    private quizRealtimeService: QuizRealtimeService,
  ) {}

  afterInit(server: Server) {
    this.quizRealtimeService.registerServer(server);
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
      client.join(`role_${payload.role}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('saveAnswer')
  async handleSaveAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { attemptId: number; questionId: number; optionIndex: number },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    try {
      const attempt = await this.quizService.saveAnswer(
        data.attemptId,
        user.userId,
        data.questionId,
        data.optionIndex,
      );
      client.emit('answerSaved', {
        questionId: data.questionId,
        optionIndex: data.optionIndex,
        savedAt: new Date(),
      });
    } catch (err) {
      client.emit('quizError', { message: err.message });
    }
  }

  @SubscribeMessage('tabSwitch')
  async handleTabSwitch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { attemptId: number },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    try {
      const attempt = await this.quizService.reportTabSwitch(
        data.attemptId,
        user.userId,
      );
      client.emit('tabSwitchRecorded', {
        count: attempt.tabSwitchCount,
        flagged: attempt.flaggedCheating,
      });
      if (attempt.flaggedCheating) {
        client.emit('cheatingDetected', {
          message:
            'You have been flagged for cheating due to multiple tab switches.',
          count: attempt.tabSwitchCount,
        });
      }
    } catch (err) {
      client.emit('quizError', { message: err.message });
    }
  }

  @SubscribeMessage('phoneDetected')
  async handlePhoneDetected(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { attemptId: number },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    try {
      await this.quizService.reportPhoneDetected(data.attemptId, user.userId);
    } catch {
      // attempt already submitted or not found — ignore
    }
  }

  @SubscribeMessage('submitQuiz')
  async handleSubmitQuiz(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { attemptId: number; answers: Record<number, number> },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;
    try {
      const attempt = await this.quizService.submitQuiz(
        data.attemptId,
        user.userId,
        data.answers,
      );
      client.emit('quizSubmitted', {
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        flaggedCheating: attempt.flaggedCheating,
        tabSwitchCount: attempt.tabSwitchCount,
      });
    } catch (err) {
      client.emit('quizError', { message: err.message });
    }
  }
}
