import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ReleaseReportDto } from '../../presentation/dto/release-report.dto';

function roomFor(sprintId: string): string {
  return `release-readiness:${sprintId}`;
}

// Real-time push for the Release Readiness page. Only ever reachable through the persistent
// worker process (apps/api/src/worker.ts) -- the main API is deployed as a Vercel serverless
// function and can never hold a WebSocket connection open, so this gateway is deliberately never
// wired into apps/api/src/main.ts's bootstrap. Clients connect straight to the worker's own
// public URL (NEXT_PUBLIC_REALTIME_URL) for this namespace, separate from the REST API host.
@WebSocketGateway({
  namespace: '/release-readiness',
  cors: { origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true },
})
export class ReleaseReadinessGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ReleaseReadinessGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() sprintId: string): void {
    if (typeof sprintId !== 'string' || sprintId.length === 0) return;
    void client.join(roomFor(sprintId));
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() sprintId: string): void {
    if (typeof sprintId !== 'string' || sprintId.length === 0) return;
    void client.leave(roomFor(sprintId));
  }

  broadcastUpdated(sprintId: string, report: ReleaseReportDto): void {
    this.server?.to(roomFor(sprintId)).emit('release-readiness:updated', report);
  }
}
