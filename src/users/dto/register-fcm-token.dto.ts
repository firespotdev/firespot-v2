import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'The FCM token from the client browser',
    example: 'fcm_token_xyz_123',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
