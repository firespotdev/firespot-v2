import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../schemas/user.schema";
import { AccountLinkingService } from "./account-linking.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [AccountLinkingService],
  exports: [AccountLinkingService],
})
export class AccountLinkingModule {}
