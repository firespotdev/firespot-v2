import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post as HttpPost,
  Request as NestRequest,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePostDto, PreviewPostDto, UpdatePostDto } from "./dto/post.dto";
import { PostsService } from "./posts.service";

type AuthenticatedRequest = Request & { user: { userId: string } };

@ApiTags("posts")
@Controller("posts")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @HttpPost("preview")
  preview(
    @NestRequest() req: AuthenticatedRequest,
    @Body() dto: PreviewPostDto,
  ) {
    return this.postsService.preview(req.user.userId, dto.sourceUrl);
  }

  @HttpPost()
  create(@NestRequest() req: AuthenticatedRequest, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.userId, dto);
  }

  @Get()
  listMine(@NestRequest() req: AuthenticatedRequest) {
    return this.postsService.listMine(req.user.userId);
  }

  @Get(":id")
  getMine(@NestRequest() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.postsService.getMine(id, req.user.userId);
  }

  @Patch(":id")
  update(
    @NestRequest() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, req.user.userId, dto);
  }

  @Delete(":id")
  remove(@NestRequest() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.postsService.remove(id, req.user.userId);
  }
}

@ApiTags("posts")
@Controller("public/posts")
export class PublicPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get("feed")
  feed() {
    return this.postsService.feed();
  }
}
