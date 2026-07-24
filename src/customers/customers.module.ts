import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  MerchantCustomer,
  MerchantCustomerSchema,
} from "../schemas/merchant-customer.schema";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { AccountLinkingModule } from "../account-linking/account-linking.module";
import { User, UserSchema } from "../schemas/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MerchantCustomer.name, schema: MerchantCustomerSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AccountLinkingModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
