import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface GoogleAddressComponent {
  long_name: string;
  types: string[];
}

interface GoogleGeocodeResult {
  place_id: string;
  formatted_address: string;
  address_components: GoogleAddressComponent[];
}

interface GoogleGeocodeResponse {
  status: string;
  results?: GoogleGeocodeResult[];
}

export interface ResolvedLocation {
  label: string;
  placeId: string;
}

const componentName = (components: GoogleAddressComponent[], types: string[]) =>
  components.find((component) =>
    types.some((type) => component.types.includes(type)),
  )?.long_name;

export const formatLocationLabel = (results: GoogleGeocodeResult[]) => {
  const components = results.flatMap(
    (result) => result.address_components || [],
  );
  const area = componentName(components, [
    "neighborhood",
    "sublocality_level_1",
    "sublocality",
    "administrative_area_level_3",
  ]);
  const city = componentName(components, ["locality"]);
  const localGovernment = componentName(components, [
    "administrative_area_level_2",
  ]);
  const state = componentName(components, ["administrative_area_level_1"])
    ?.replace(/\s+State$/i, "")
    .trim();
  const middle = city && city !== state ? city : localGovernment;
  const parts = [area, middle, state].filter(
    (part, index, values): part is string =>
      Boolean(part) && values.indexOf(part) === index,
  );

  return parts.length
    ? `${parts.join(", ")}.`
    : results[0]?.formatted_address || "Unknown location";
};

@Injectable()
export class GoogleGeocodingService {
  constructor(private readonly configService: ConfigService) {}

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ResolvedLocation> {
    const apiKey = this.configService.get<string>("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Location lookup is not configured",
      );
    }

    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      key: apiKey,
      language: "en",
      region: "ng",
    });
    let response: Response;
    try {
      response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      );
    } catch {
      throw new ServiceUnavailableException("Could not look up location");
    }

    if (!response.ok) {
      throw new ServiceUnavailableException("Could not look up location");
    }
    let body: GoogleGeocodeResponse;
    try {
      body = (await response.json()) as GoogleGeocodeResponse;
    } catch {
      throw new ServiceUnavailableException("Could not look up location");
    }
    const result = body.results?.[0];
    if (body.status !== "OK" || !result) {
      throw new ServiceUnavailableException("Could not identify location");
    }

    return {
      label: formatLocationLabel(body.results || []),
      placeId: result.place_id,
    };
  }
}
