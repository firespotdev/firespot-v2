import { normalizeNigerianPhone } from "./phone";

describe("normalizeNigerianPhone", () => {
  it.each([
    ["08031234567", "8031234567"],
    ["8031234567", "8031234567"],
    ["+2348031234567", "8031234567"],
    ["234 803 123 4567", "8031234567"],
  ])("normalizes %s to one Nigerian identity", (input, expected) => {
    expect(normalizeNigerianPhone(input)).toBe(expected);
  });
});
