import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Product, ProductSchema } from "../schemas/product.schema";
import { Post, PostSchema } from "../schemas/post.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { PostsController, PublicPostsController } from "./posts.controller";
import { PostsService } from "./posts.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PostsController, PublicPostsController],
  providers: [PostsService],
})
export class PostsModule {}
