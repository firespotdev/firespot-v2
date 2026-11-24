import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../schemas/user.schema";
import { ProductsModule } from "../products/products.module";
import { PostsModule } from "../posts/posts.module";
import { SavedController } from "./saved.controller";
import { SavedService } from "./saved.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ProductsModule,
    PostsModule,
  ],
  controllers: [SavedController],
  providers: [SavedService],
})
export class SavedModule {}
