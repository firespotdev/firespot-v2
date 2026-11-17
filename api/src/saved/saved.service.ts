import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "../schemas/user.schema";
import { ProductsService } from "../products/products.service";
import { PostsService } from "../posts/posts.service";

type SavedField = "savedProducts" | "savedPosts";

const objectId = (id: string, label: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`Invalid ${label} id`);
  }
  return new Types.ObjectId(id);
};

/** Items and posts a customer saved, shown on their Saved page. */
@Injectable()
export class SavedService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private productsService: ProductsService,
    private postsService: PostsService,
  ) {}

  /** Saved ids, newest first ($addToSet appends, so the end is newest). */
  private async savedIds(userId: string, field: SavedField) {
    const user = await this.userModel
      .findById(userId)
      .select(field)
      .lean()
      .exec();
    if (!user) throw new NotFoundException("User not found");
    const ids = (user[field] as Types.ObjectId[] | undefined) ?? [];
    return [...ids].reverse();
  }

  private update(userId: string, operation: "$addToSet" | "$pull", field: SavedField, id: Types.ObjectId) {
    return this.userModel
      .updateOne(
        { _id: new Types.ObjectId(userId) },
        { [operation]: { [field]: id } },
      )
      .exec();
  }

  async listItems(userId: string) {
    const ids = await this.savedIds(userId, "savedProducts");
    return { items: await this.productsService.findPublicByIds(ids) };
  }

  async saveItem(userId: string, productId: string) {
    const id = objectId(productId, "item");
    const [found] = await this.productsService.findPublicByIds([id]);
    if (!found) throw new NotFoundException("Item not found");
    await this.update(userId, "$addToSet", "savedProducts", id);
    return { saved: true };
  }

  async unsaveItem(userId: string, productId: string) {
    await this.update(userId, "$pull", "savedProducts", objectId(productId, "item"));
    return { saved: false };
  }

  async listPosts(userId: string) {
    const ids = await this.savedIds(userId, "savedPosts");
    return { posts: await this.postsService.findPublishedByIds(ids) };
  }

  async savePost(userId: string, postId: string) {
    const id = objectId(postId, "post");
    const [found] = await this.postsService.findPublishedByIds([id]);
    if (!found) throw new NotFoundException("Post not found");
    await this.update(userId, "$addToSet", "savedPosts", id);
    return { saved: true };
  }

  async unsavePost(userId: string, postId: string) {
    await this.update(userId, "$pull", "savedPosts", objectId(postId, "post"));
    return { saved: false };
  }
}
