import { Types } from "mongoose";
import { CurrentLocationService } from "./current-location.service";
import { formatLocationLabel } from "./services/google-geocoding.service";

describe("CurrentLocationService", () => {
  it("persists personal coordinates separately and returns the resolved label", async () => {
    let saved = false;
    const save = () => {
      saved = true;
      return Promise.resolve();
    };
    const user: {
      _id: Types.ObjectId;
      save: () => Promise<void>;
      personalLocation?: { type: "Point"; coordinates: [number, number] };
      personalLocationPlaceId?: string;
      personalLocationAccuracyMeters?: number;
      personalLocationCapturedAt?: Date;
    } = {
      _id: new Types.ObjectId(),
      save,
    };
    const userModel = {
      findById: jest.fn().mockResolvedValue(user),
    };
    const geocodingService = {
      reverseGeocode: jest.fn().mockResolvedValue({
        label: "Lekki Phase 1, Eti-Osa, Lagos.",
        placeId: "google-place-id",
      }),
    };
    const service = Object.create(
      CurrentLocationService.prototype,
    ) as CurrentLocationService;
    Object.assign(service, { userModel, geocodingService });

    const result = await service.update(String(user._id), {
      latitude: 6.4474,
      longitude: 3.4721,
      accuracyMeters: 25,
    });

    expect(user).toMatchObject({
      personalLocation: {
        type: "Point",
        coordinates: [3.4721, 6.4474],
      },
      personalLocationPlaceId: "google-place-id",
      personalLocationAccuracyMeters: 25,
    });
    expect(user.personalLocationCapturedAt).toBeInstanceOf(Date);
    expect(saved).toBe(true);
    expect(result.location).toMatchObject({
      label: "Lekki Phase 1, Eti-Osa, Lagos.",
      attribution: "Google Maps",
    });
  });
});

describe("formatLocationLabel", () => {
  it("uses the neighborhood, local government, and state without duplicates", () => {
    const label = formatLocationLabel([
      {
        place_id: "google-place-id",
        formatted_address: "Lekki Phase 1, Lagos, Nigeria",
        address_components: [
          { long_name: "Lekki Phase 1", types: ["neighborhood"] },
          {
            long_name: "Eti-Osa",
            types: ["administrative_area_level_2"],
          },
          {
            long_name: "Lagos",
            types: ["administrative_area_level_1"],
          },
        ],
      },
    ]);

    expect(label).toBe("Lekki Phase 1, Eti-Osa, Lagos.");
  });

  it("combines a detailed area from later results with the city and state", () => {
    const label = formatLocationLabel([
      {
        place_id: "plus-code-result",
        formatted_address: "5C87+WR Abeokuta, Nigeria",
        address_components: [
          { long_name: "Abeokuta", types: ["locality"] },
          {
            long_name: "Ogun State",
            types: ["administrative_area_level_1"],
          },
        ],
      },
      {
        place_id: "detailed-result",
        formatted_address: "Obantoko, Ogun State, Nigeria",
        address_components: [
          {
            long_name: "Obantoko",
            types: ["administrative_area_level_3"],
          },
          {
            long_name: "Odeda",
            types: ["administrative_area_level_2"],
          },
          {
            long_name: "Ogun State",
            types: ["administrative_area_level_1"],
          },
        ],
      },
    ]);

    expect(label).toBe("Obantoko, Abeokuta, Ogun.");
  });
});
