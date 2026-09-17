import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "../schemas/user.schema";
import { UpdateCurrentLocationDto } from "./dto/update-current-location.dto";
import { GoogleGeocodingService } from "./services/google-geocoding.service";

@Injectable()
export class CurrentLocationService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly geocodingService: GoogleGeocodingService,
  ) {}

  private responseFor(user: UserDocument, label: string, placeId: string) {
    const coordinates = user.personalLocation?.coordinates;
    if (!coordinates) return { location: null };

    return {
      location: {
        latitude: coordinates[1],
        longitude: coordinates[0],
        accuracyMeters: user.personalLocationAccuracyMeters ?? null,
        capturedAt: user.personalLocationCapturedAt ?? null,
        label,
        placeId,
        attribution: "Google Maps" as const,
      },
    };
  }

  async get(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    const coordinates = user.personalLocation?.coordinates;
    if (!coordinates) return { location: null };

    const resolved = await this.geocodingService.reverseGeocode(
      coordinates[1],
      coordinates[0],
    );
    return this.responseFor(user, resolved.label, resolved.placeId);
  }

  async update(userId: string, dto: UpdateCurrentLocationDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    const resolved = await this.geocodingService.reverseGeocode(
      dto.latitude,
      dto.longitude,
    );

    user.personalLocation = {
      type: "Point",
      coordinates: [dto.longitude, dto.latitude],
    };
    user.personalLocationPlaceId = resolved.placeId;
    user.personalLocationAccuracyMeters = dto.accuracyMeters;
    user.personalLocationCapturedAt = new Date();
    await user.save();

    return this.responseFor(user, resolved.label, resolved.placeId);
  }
}
