import {
  calculatePaystackFee,
  calculateFirespotFee,
  splitBreakdown,
} from "./fees";

describe("Fee Engine", () => {
  describe("calculatePaystackFee", () => {
    it("returns 0 for zero or negative amounts", () => {
      expect(calculatePaystackFee(0)).toBe(0);
      expect(calculatePaystackFee(-100)).toBe(0);
    });

    it("waives flat fee below ₦2,500 threshold", () => {
      // ₦1,000 * 1.5% = ₦15
      expect(calculatePaystackFee(1000)).toBe(15);

      // ₦2,499 * 1.5% = ₦37.485
      expect(calculatePaystackFee(2499)).toBeCloseTo(37.485, 3);
    });

    it("applies ₦100 flat fee at ₦2,500 threshold and above", () => {
      // ₦2,500 * 1.5% + ₦100 = ₦37.5 + ₦100 = ₦137.5
      expect(calculatePaystackFee(2500)).toBe(137.5);

      // ₦5,000 * 1.5% + ₦100 = ₦75 + ₦100 = ₦175
      expect(calculatePaystackFee(5000)).toBe(175);

      // ₦50,000 * 1.5% + ₦100 = ₦750 + ₦100 = ₦850
      expect(calculatePaystackFee(50000)).toBe(850);
    });

    it("caps Paystack fee at ₦2,000 for large amounts", () => {
      // ₦126,666 * 1.5% + ₦100 = ₦1,999.99 < ₦2,000
      expect(calculatePaystackFee(126666)).toBeLessThan(2000);

      // ₦126,667 * 1.5% + ₦100 = ₦2,000.005 -> capped at ₦2,000
      expect(calculatePaystackFee(126667)).toBe(2000);

      // ₦200,000 * 1.5% + ₦100 = ₦3,100 -> capped at ₦2,000
      expect(calculatePaystackFee(200000)).toBe(2000);
    });
  });

  describe("calculateFirespotFee", () => {
    it("returns 0 for zero or negative amounts", () => {
      expect(calculateFirespotFee(0)).toBe(0);
      expect(calculateFirespotFee(-500)).toBe(0);
    });

    it("calculates flat 0.5% for any amount", () => {
      // ₦1,000 * 0.5% = ₦5
      expect(calculateFirespotFee(1000)).toBe(5);

      // ₦5,000 * 0.5% = ₦25
      expect(calculateFirespotFee(5000)).toBe(25);

      // ₦50,000 * 0.5% = ₦250
      expect(calculateFirespotFee(50000)).toBe(250);

      // ₦200,000 * 0.5% = ₦1,000
      expect(calculateFirespotFee(200000)).toBe(1000);
    });
  });

  describe("splitBreakdown", () => {
    it("prefers Paystack's actual fee over the pricing estimate", () => {
      expect(splitBreakdown(5000, 123.45)).toEqual({
        gross: 5000,
        paystackFee: 123.45,
        firespotFee: 25,
        net: 4851.55,
      });
    });

    it("calculates breakdown for ₦1,000", () => {
      const res = splitBreakdown(1000);
      expect(res).toEqual({
        gross: 1000,
        paystackFee: 15,
        firespotFee: 5,
        net: 980,
      });
    });

    it("calculates breakdown for ₦2,499 boundary", () => {
      const res = splitBreakdown(2499);
      expect(res.gross).toBe(2499);
      expect(res.paystackFee).toBe(37.49);
      expect(res.firespotFee).toBe(12.5);
      expect(res.net).toBe(2449.01);
    });

    it("calculates breakdown for ₦2,500 boundary", () => {
      const res = splitBreakdown(2500);
      expect(res.gross).toBe(2500);
      expect(res.paystackFee).toBe(137.5);
      expect(res.firespotFee).toBe(12.5);
      expect(res.net).toBe(2350);
    });

    it("calculates breakdown for ₦5,000", () => {
      const res = splitBreakdown(5000);
      expect(res).toEqual({
        gross: 5000,
        paystackFee: 175,
        firespotFee: 25,
        net: 4800,
      });
    });

    it("calculates breakdown for ₦50,000 (LITE daily cap)", () => {
      const res = splitBreakdown(50000);
      expect(res).toEqual({
        gross: 50000,
        paystackFee: 850,
        firespotFee: 250,
        net: 48900,
      });
    });

    it("calculates breakdown for ₦200,000 (capped Paystack fee)", () => {
      const res = splitBreakdown(200000);
      expect(res).toEqual({
        gross: 200000,
        paystackFee: 2000,
        firespotFee: 1000,
        net: 197000,
      });
    });
  });
});
