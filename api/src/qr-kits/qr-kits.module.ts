import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { QRKitsController } from "./qr-kits.controller";
import { QRKitsService } from "./qr-kits.service";
import { QRKit, QRKitSchema } from "../schemas/qrkit.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { Agent, AgentSchema } from "../admin/schemas/agent.schema";
import { UsersModule } from "../users/users.module";
import { ScansModule } from "../scans/scans.module";
import { QRCodeService } from "../services/qr-code.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QRKit.name, schema: QRKitSchema },
      { name: User.name, schema: UserSchema },
      { name: Agent.name, schema: AgentSchema },
    ]),
    forwardRef(() => UsersModule),
    ScansModule,
  ],
  controllers: [QRKitsController],
  providers: [QRKitsService, QRCodeService],
  exports: [QRKitsService],
})
export class QRKitsModule {}
