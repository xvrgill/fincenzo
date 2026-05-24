import { describe, expect, it } from "vitest";
import { matchRule, type LoadedRule } from "./rules";

const rules: LoadedRule[] = [
  { matchType: "merchant_equals", matchValue: "Starbucks", category: "Coffee" },
  { matchType: "name_contains", matchValue: "uber", category: "Transport" },
  { matchType: "name_contains", matchValue: "amazon", category: "Shopping" },
];

describe("matchRule", () => {
  it("matches merchant_equals exactly", () => {
    expect(matchRule(rules, "Starbucks", "STARBUCKS STORE #123")).toBe("Coffee");
  });

  it("falls back to name when merchant is null", () => {
    expect(matchRule(rules, null, "Starbucks")).toBe("Coffee");
  });

  it("matches name_contains case-insensitively", () => {
    expect(matchRule(rules, null, "UBER TRIP 8AM")).toBe("Transport");
    expect(matchRule(rules, "Uber Eats", "uber eats sf")).toBe("Transport");
  });

  it("prefers merchant_equals over name_contains", () => {
    const mixed: LoadedRule[] = [
      { matchType: "name_contains", matchValue: "starbucks", category: "Shopping" },
      { matchType: "merchant_equals", matchValue: "Starbucks", category: "Coffee" },
    ];
    expect(matchRule(mixed, "Starbucks", "starbucks #1")).toBe("Coffee");
  });

  it("returns null when nothing matches", () => {
    expect(matchRule(rules, "Walgreens", "WALGREENS 4421")).toBe(null);
  });

  it("returns null on empty rule list", () => {
    expect(matchRule([], "Starbucks", "Starbucks")).toBe(null);
  });

  it("ignores empty needle values defensively", () => {
    const bad: LoadedRule[] = [
      { matchType: "name_contains", matchValue: "   ", category: "Bug" },
    ];
    expect(matchRule(bad, null, "anything")).toBe(null);
  });

  it("first matching rule of a type wins", () => {
    const dupes: LoadedRule[] = [
      { matchType: "name_contains", matchValue: "amazon", category: "First" },
      { matchType: "name_contains", matchValue: "amazon", category: "Second" },
    ];
    expect(matchRule(dupes, null, "AMAZON.COM")).toBe("First");
  });
});
