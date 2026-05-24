import { describe, expect, it } from "vitest";
import { formatDate, formatMoneyCents, prettifyCategory } from "./format";

describe("formatMoneyCents", () => {
  it("formats USD by default", () => {
    expect(formatMoneyCents(1234)).toBe("$12.34");
  });

  it("renders an em-dash for null and undefined", () => {
    expect(formatMoneyCents(null)).toBe("—");
    expect(formatMoneyCents(undefined)).toBe("—");
  });

  it("renders zero as $0.00, not the placeholder", () => {
    expect(formatMoneyCents(0)).toBe("$0.00");
  });

  it("renders negatives with a leading minus", () => {
    expect(formatMoneyCents(-500)).toBe("-$5.00");
  });

  it("supports non-USD currencies", () => {
    // en-US locale renders EUR as "€12.34"
    expect(formatMoneyCents(1234, "EUR")).toContain("12.34");
  });
});

describe("formatDate", () => {
  it("renders Month Day, Year for a Date input", () => {
    expect(formatDate(new Date("2026-01-15T12:00:00Z"))).toMatch(/Jan \d+, 2026/);
  });

  it("accepts an ISO string", () => {
    expect(formatDate("2026-05-23T00:00:00Z")).toMatch(/May \d+, 2026/);
  });
});

describe("prettifyCategory", () => {
  it("titlecases SCREAMING_SNAKE", () => {
    expect(prettifyCategory("FOOD_AND_DRINK")).toBe("Food And Drink");
  });

  it("leaves already-human strings alone", () => {
    expect(prettifyCategory("Groceries")).toBe("Groceries");
  });

  it("handles single all-caps word", () => {
    // No underscore + all caps still falls through the first branch (no underscore AND === toUpperCase).
    // Current behavior: returns lowercase-titlecased ("Atm").
    expect(prettifyCategory("ATM")).toBe("Atm");
  });
});
