import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Store, StoreSchema } from '../schemas/store.schema'
import { User, UserSchema } from '../schemas/user.schema'
import { UsersModule } from '../users/users.module'
import { StoresController } from './stores.controller'
import { StoresService } from './stores.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Store.name, schema: StoreSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
  ],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
