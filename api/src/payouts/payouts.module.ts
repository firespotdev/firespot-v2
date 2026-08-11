import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PayoutsController } from "./payouts.controller";
import { PayoutsService } from "./payouts.service";
import { User, UserSchema } from "../schemas/user.schema";
import { UsersModule } from "../users/users.module";
import { Sale, SaleSchema } from "../schemas/sale.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Sale.name, schema: SaleSchema },
    ]),
    UsersModule,
  ],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
