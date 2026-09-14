import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Attaches a verified user when a bearer token exists; permits anonymous use. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = unknown>(
    _error: unknown,
    user: TUser | false | null,
  ): TUser | undefined {
    return user || undefined;
  }
}
