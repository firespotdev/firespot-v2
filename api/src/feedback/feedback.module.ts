import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Feedback, FeedbackSchema } from "../schemas/feedback.schema";
import { Sale, SaleSchema } from "../schemas/sale.schema";
import { QRKit, QRKitSchema } from "../schemas/qrkit.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
