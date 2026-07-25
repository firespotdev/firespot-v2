import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PaystackService } from "./services/paystack.service";
import { CloudinaryService } from "./services/cloudinary.service";
import { User, UserSchema } from "../schemas/user.schema";
import { QRKit, QRKitSchema } from "../schemas/qrkit.schema";
import { Agent, AgentSchema } from "../admin/schemas/agent.schema";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: Agent.name, schema: AgentSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, PaystackService, CloudinaryService],
  exports: [UsersService, PaystackService],
})
export class UsersModule {}
