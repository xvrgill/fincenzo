import { describe, expect, it } from "vitest";
import { forecastCashFlow, scheduleRecurring, type RecurringInput } from "./forecast";

describe("scheduleRecurring", () => {
  it("emits the next monthly occurrence after lastSeenDate", () => {
    const charges = scheduleRecurring(
      [{ merchantName: "Netflix", cadence: "monthly", averageAmountCents: 1599, lastSeenDate: "2026-05-15" }],
      "2026-05-23",
      90,
    );
    expect(charges).toHaveLength(3);
    expect(charges[0].date).toBe("2026-06-14");
  });

  it("emits weekly occurrences inside the window", () => {
    const charges = scheduleRecurring(
      [{ merchantName: "Gym", cadence: "weekly", averageAmountCents: 1000, lastSeenDate: "2026-05-22" }],
      "2026-05-23",
      30,
    );
    // 5/29, 6/5, 6/12, 6/19 — four hits within 30 days
    expect(charges.map((c) => c.date)).toEqual(["2026-05-29", "2026-06-05", "2026-06-12", "2026-06-19"]);
  });

  it("does not emit charges when lastSeenDate is already inside the window", () => {
    // First occurrence after a Jan 1 last-seen monthly is Jan 31 — falls outside a 10-day window.
    const charges = scheduleRecurring(
      [{ merchantName: "X", cadence: "monthly", averageAmountCents: 100, lastSeenDate: "2026-01-01" }],
      "2026-01-02",
      10,
    );
    expect(charges).toEqual([]);
  });

  it("orders multiple merchants chronologically", () => {
    const recurring: RecurringInput[] = [
      { merchantName: "Yearly", cadence: "yearly", averageAmountCents: 9900, lastSeenDate: "2025-06-10" },
      { merchantName: "Weekly", cadence: "weekly", averageAmountCents: 500, lastSeenDate: "2026-05-22" },
    ];
    const charges = scheduleRecurring(recurring, "2026-05-23", 30);
    expect(charges[0].merchantName).toBe("Weekly");
    // Yearly hit (2026-06-10) should come after first weekly (2026-05-29)
    expect(charges.some((c) => c.merchantName === "Yearly" && c.date === "2026-06-10")).toBe(true);
  });
});

describe("forecastCashFlow", () => {
  it("applies the daily baseline to the starting balance", () => {
    const out = forecastCashFlow({
      startDate: "2026-05-23",
      horizonDays: 3,
      startingBalanceCents: 100_000,
      avgDailyIncomeCents: 10_000,
      avgDailyDiscretionaryCents: 3_000,
      recurring: [],
    });
    expect(out.map((p) => p.balanceCents)).toEqual([107_000, 114_000, 121_000]);
  });

  it("subtracts scheduled recurring charges on their day", () => {
    const out = forecastCashFlow({
      startDate: "2026-05-23",
      horizonDays: 30,
      startingBalanceCents: 100_000,
      avgDailyIncomeCents: 0,
      avgDailyDiscretionaryCents: 0,
      recurring: [
        { merchantName: "Netflix", cadence: "monthly", averageAmountCents: 1599, lastSeenDate: "2026-05-15" },
      ],
    });
    // Netflix hits on 2026-06-14 (lastSeen + 30d), so balance drops by 1599 that day and stays put.
    const hitDay = out.find((p) => p.date === "2026-06-14")!;
    expect(hitDay.scheduledChargeCents).toBe(1599);
    expect(hitDay.balanceCents).toBe(100_000 - 1599);
    expect(out[out.length - 1].balanceCents).toBe(100_000 - 1599);
  });

  it("produces exactly horizonDays points", () => {
    const out = forecastCashFlow({
      startDate: "2026-05-23",
      horizonDays: 90,
      startingBalanceCents: 0,
      avgDailyIncomeCents: 0,
      avgDailyDiscretionaryCents: 0,
      recurring: [],
    });
    expect(out).toHaveLength(90);
  });

  it("can produce a negative balance (runway exhausted)", () => {
    const out = forecastCashFlow({
      startDate: "2026-05-23",
      horizonDays: 30,
      startingBalanceCents: 5_000,
      avgDailyIncomeCents: 0,
      avgDailyDiscretionaryCents: 1_000,
      recurring: [],
    });
    expect(out[out.length - 1].balanceCents).toBeLessThan(0);
  });
});
