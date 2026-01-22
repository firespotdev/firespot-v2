import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateQRKitDto {
  @ApiProperty({
    description: 'Agent ID to assign QRKit to (required)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  agentId: string;
}
