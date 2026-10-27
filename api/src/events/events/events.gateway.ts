import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    clearTimeout(client.data.expiryTimer);
  }

  @SubscribeMessage('join-merchant-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() merchantId: string,
  ) {
    try {
      const payload = await this.jwt.verifyAsync(client.handshake.auth?.token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      if (payload.type !== 'access' || payload.sub !== merchantId) {
        return { status: 'failed' };
      }
      await client.join(merchantId);
      clearTimeout(client.data.expiryTimer);
      client.data.expiryTimer = setTimeout(() => client.disconnect(true), Math.max(0, payload.exp * 1000 - Date.now()));
      return { status: 'joined', room: merchantId };
    } catch {
      return { status: 'failed' };
    }
  }

  @SubscribeMessage('join-sale-room')
  handleJoinSaleRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() saleId: string,
  ) {
    if (saleId) {
      client.join(`sale-${saleId}`);
      return { status: 'joined', room: `sale-${saleId}` };
    }
    return { status: 'failed' };
  }
}
