jest.mock("nanoid", () => ({ customAlphabet: () => () => "test-slug" }));

import { ValidationPipe } from "@nestjs/common";
import { UpdateActiveHoursSetupDto } from "./dto/shop-setup.dto";
import { UsersService } from "./users.service";

interface SavedHours {
  openingHours: {
    timezone: string;
    days: Array<{ opensAt?: string; closesAt?: string }>;
  };
  appointmentAndReservation?: unknown;
  configuredAt: Date;
}

describe("Active hours", () => {
  const userModel = { findById: jest.fn() };
  const service = new UsersService(
    userModel as unknown as ConstructorParameters<typeof UsersService>[0],
    {} as ConstructorParameters<typeof UsersService>[1],
    {} as ConstructorParameters<typeof UsersService>[2],
    {} as ConstructorParameters<typeof UsersService>[3],
    {} as ConstructorParameters<typeof UsersService>[4],
    {} as ConstructorParameters<typeof UsersService>[5],
    {} as ConstructorParameters<typeof UsersService>[6],
    {} as ConstructorParameters<typeof UsersService>[7],
    {} as ConstructorParameters<typeof UsersService>[8],
    {} as ConstructorParameters<typeof UsersService>[9],
    {} as ConstructorParameters<typeof UsersService>[10],
  );
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const validate = (value: unknown): Promise<UpdateActiveHoursSetupDto> =>
    pipe.transform(value, {
      type: "body",
      metatype: UpdateActiveHoursSetupDto,
    }) as Promise<UpdateActiveHoursSetupDto>;

  const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const week = (opensAt = "08:00", closesAt = "20:00") =>
    WEEK.map((day) => ({
      day,
      enabled: day !== "SUN",
      closesNextDay: false,
      ...(day !== "SUN" ? { opensAt, closesAt } : {}),
    }));
  const openingHours = (opensAt?: string, closesAt?: string) => ({
    useDifferentTimes: false,
    timezone: "Africa/Lagos",
    days: week(opensAt, closesAt),
  });
  const tableBooking = {
    bookingType: "SPACE",
    bookableHours: { days: week() },
    capacity: { guestsAtOnce: 10, largestGroup: 4 },
    instantConfirmation: false,
    freeCancellations: false,
    deposit: { amount: 0, depositType: "FIXED" },
    freeCancellationHours: 0,
  };
  const merchant = (activeHoursSetup?: Record<string, unknown>) => ({
    role: "merchant",
    activeHoursSetup,
    save: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => jest.clearAllMocks());

  it("saves opening hours without booking details", async () => {
    const user = merchant();
    userModel.findById.mockResolvedValue(user);
    const dto = await validate({ openingHours: openingHours() });

    await service.updateActiveHoursSetup("merchant-id", dto);

    expect(user.save).toHaveBeenCalled();
    const saved = user.activeHoursSetup as unknown as SavedHours | undefined;
    expect(saved?.openingHours.timezone).toBe("Africa/Lagos");
    expect(saved?.configuredAt).toBeInstanceOf(Date);
    expect(saved).not.toHaveProperty("appointmentAndReservation");
  });

  it("keeps an earlier booking setup when only hours are sent", async () => {
    const user = merchant({
      openingHours: openingHours("09:00", "17:00"),
      appointmentAndReservation: tableBooking,
      configuredAt: new Date("2026-01-01"),
    });
    userModel.findById.mockResolvedValue(user);
    const dto = await validate({
      openingHours: openingHours("08:00", "20:00"),
    });

    await service.updateActiveHoursSetup("merchant-id", dto);

    const saved = user.activeHoursSetup as unknown as SavedHours;
    expect(saved.openingHours.days[1]).toMatchObject({
      opensAt: "08:00",
      closesAt: "20:00",
    });
    expect(saved.appointmentAndReservation).toEqual(tableBooking);
  });

  it("still validates booking details when they are sent", async () => {
    userModel.findById.mockResolvedValue(merchant());
    const dto = await validate({
      openingHours: openingHours(),
      appointmentAndReservation: {
        ...tableBooking,
        capacity: { guestsAtOnce: 2, largestGroup: 4 },
      },
    });

    await expect(
      service.updateActiveHoursSetup("merchant-id", dto),
    ).rejects.toThrow("Largest group cannot exceed guests at once");
  });

  it("still rejects opening hours with no open day", async () => {
    userModel.findById.mockResolvedValue(merchant());
    const closedWeek = openingHours();
    closedWeek.days = closedWeek.days.map(({ day }) => ({
      day,
      enabled: false,
      closesNextDay: false,
    }));
    const dto = await validate({ openingHours: closedWeek });

    await expect(
      service.updateActiveHoursSetup("merchant-id", dto),
    ).rejects.toThrow("Opening hours must include at least one open day");
  });
});
