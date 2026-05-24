import { describe, expect, it } from "vitest";
import { detectRecurring, normalizeMerchant, type DetectorTx } from "./recurring";

function tx(date: string, amountCents: number, merchant: string, name = merchant): DetectorTx {
  return { date, amountCents, merchantName: merchant, name };
}

describe("normalizeMerchant", () => {
  it("strips store numbers and lowercases", () => {
    expect(normalizeMerchant("STARBUCKS #1234", "STARBUCKS #1234")).toBe("starbucks");
  });

  it("collapses asterisk suffixes (Amazon-style)", () => {
    expect(normalizeMerchant("AMAZON.COM*ABC123", "AMZN MKT")).toBe("amazon.com");
  });

  it("falls back to name when merchant is null", () => {
    expect(normalizeMerchant(null, "Netflix")).toBe("netflix");
  });

  it("returns empty string when both inputs are empty", () => {
    expect(normalizeMerchant(null, "")).toBe("");
  });

  it("drops long city suffixes by capping tokens", () => {
    expect(normalizeMerchant("Trader Joes Brooklyn NY", "Trader Joes")).toBe("trader joes brooklyn");
  });
});

describe("detectRecurring", () => {
  it("returns nothing for a transaction list with fewer than 3 occurrences", () => {
    expect(detectRecurring([tx("2026-01-01", 1599, "Netflix"), tx("2026-02-01", 1599, "Netflix")])).toEqual([]);
  });

  it("detects a monthly subscription with stable amount", () => {
    const txns = [
      tx("2026-01-15", 1599, "Netflix"),
      tx("2026-02-15", 1599, "Netflix"),
      tx("2026-03-15", 1599, "Netflix"),
      tx("2026-04-15", 1599, "Netflix"),
    ];
    const [hit] = detectRecurring(txns);
    expect(hit).toMatchObject({
      merchantKey: "netflix",
      cadence: "monthly",
      averageAmountCents: 1599,
      sampleCount: 4,
      firstSeenDate: "2026-01-15",
      lastSeenDate: "2026-04-15",
    });
    // Next expected ~30 days after last seen
    expect(hit.nextExpectedDate >= "2026-05-10" && hit.nextExpectedDate <= "2026-05-20").toBe(true);
  });

  it("detects a weekly charge", () => {
    const txns = [
      tx("2026-01-01", 1299, "Gym"),
      tx("2026-01-08", 1299, "Gym"),
      tx("2026-01-15", 1299, "Gym"),
      tx("2026-01-22", 1299, "Gym"),
    ];
    const [hit] = detectRecurring(txns);
    expect(hit.cadence).toBe("weekly");
  });

  it("detects a yearly charge (Prime-style)", () => {
    const txns = [
      tx("2024-03-01", 13900, "Amazon Prime"),
      tx("2025-03-01", 13900, "Amazon Prime"),
      tx("2026-03-01", 13900, "Amazon Prime"),
    ];
    const [hit] = detectRecurring(txns);
    expect(hit.cadence).toBe("yearly");
  });

  it("tolerates a few cents of price variance from taxes", () => {
    const txns = [
      tx("2026-01-15", 1599, "Spotify"),
      tx("2026-02-15", 1612, "Spotify"),
      tx("2026-03-15", 1605, "Spotify"),
      tx("2026-04-15", 1599, "Spotify"),
    ];
    expect(detectRecurring(txns)).toHaveLength(1);
  });

  it("rejects merchants with wildly varying amounts", () => {
    const txns = [
      tx("2026-01-01", 5000, "Amazon"),
      tx("2026-02-01", 18000, "Amazon"),
      tx("2026-03-01", 2200, "Amazon"),
    ];
    expect(detectRecurring(txns)).toEqual([]);
  });

  it("rejects merchants with irregular spacing", () => {
    const txns = [
      tx("2026-01-01", 1599, "Hulu"),
      tx("2026-01-04", 1599, "Hulu"),
      tx("2026-03-20", 1599, "Hulu"),
    ];
    expect(detectRecurring(txns)).toEqual([]);
  });

  it("ignores refunds (negative amounts)", () => {
    const txns = [
      tx("2026-01-15", -1599, "Netflix"),
      tx("2026-02-15", -1599, "Netflix"),
      tx("2026-03-15", -1599, "Netflix"),
    ];
    expect(detectRecurring(txns)).toEqual([]);
  });

  it("treats one missed month as still monthly if most intervals match", () => {
    const txns = [
      tx("2026-01-15", 999, "iCloud"),
      tx("2026-02-15", 999, "iCloud"),
      // March skipped (card decline?)
      tx("2026-04-20", 999, "iCloud"),
      tx("2026-05-15", 999, "iCloud"),
      tx("2026-06-15", 999, "iCloud"),
    ];
    const [hit] = detectRecurring(txns);
    expect(hit?.cadence).toBe("monthly");
  });

  it("groups store-number variants under one merchant key", () => {
    const txns = [
      tx("2026-01-01", 1500, "STARBUCKS #1001"),
      tx("2026-02-01", 1500, "STARBUCKS #2002"),
      tx("2026-03-01", 1500, "STARBUCKS #3003"),
    ];
    const hits = detectRecurring(txns);
    expect(hits).toHaveLength(1);
    expect(hits[0].merchantKey).toBe("starbucks");
  });

  it("sorts candidates by average amount descending", () => {
    const txns = [
      tx("2026-01-15", 999, "Cheap"),
      tx("2026-02-15", 999, "Cheap"),
      tx("2026-03-15", 999, "Cheap"),
      tx("2026-01-15", 4999, "Pricey"),
      tx("2026-02-15", 4999, "Pricey"),
      tx("2026-03-15", 4999, "Pricey"),
    ];
    const hits = detectRecurring(txns);
    expect(hits.map((h) => h.merchantKey)).toEqual(["pricey", "cheap"]);
  });
});
