import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Spot, SpotSchema } from '../schemas/spot.schema'
import { User, UserSchema } from '../schemas/user.schema'
import { UsersModule } from '../users/users.module'
import { SpotsController } from './spots.controller'
import { SpotsService } from './spots.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Spot.name, schema: SpotSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
  ],
  controllers: [SpotsController],
  providers: [SpotsService],
  exports: [SpotsService],
})
export class SpotsModule {}
