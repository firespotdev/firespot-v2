import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    // Client disconnected
  }

  @SubscribeMessage('join-merchant-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() merchantId: string,
  ) {
    if (merchantId) {
      client.join(merchantId);
      return { status: 'joined', room: merchantId };
    }
    return { status: 'failed' };
  }
}
