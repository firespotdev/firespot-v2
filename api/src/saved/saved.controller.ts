import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SavedService } from "./saved.service";

@ApiTags("saved")
@Controller("saved")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class SavedController {
  constructor(private readonly savedService: SavedService) {}

  @Get("items")
  @ApiOperation({ summary: "Items the customer saved, newest first" })
  listItems(@Request() req) {
    return this.savedService.listItems(req.user.userId);
  }

  @Post("items/:productId")
  @ApiOperation({ summary: "Save an item" })
  saveItem(@Request() req, @Param("productId") productId: string) {
    return this.savedService.saveItem(req.user.userId, productId);
  }

  @Delete("items/:productId")
  @ApiOperation({ summary: "Unsave an item" })
  unsaveItem(@Request() req, @Param("productId") productId: string) {
    return this.savedService.unsaveItem(req.user.userId, productId);
  }

  @Get("posts")
  @ApiOperation({ summary: "Posts the customer saved, newest first" })
  listPosts(@Request() req) {
    return this.savedService.listPosts(req.user.userId);
  }

  @Post("posts/:postId")
  @ApiOperation({ summary: "Save a post" })
  savePost(@Request() req, @Param("postId") postId: string) {
    return this.savedService.savePost(req.user.userId, postId);
  }

  @Delete("posts/:postId")
  @ApiOperation({ summary: "Unsave a post" })
  unsavePost(@Request() req, @Param("postId") postId: string) {
    return this.savedService.unsavePost(req.user.userId, postId);
  }
}
