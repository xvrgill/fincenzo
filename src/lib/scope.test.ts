import { describe, expect, it } from "vitest";
import { scopeLabel, scopeRowKey, type Scope } from "./scope";

const userScope: Scope = { kind: "user", userId: "u1" };
const householdScope: Scope = {
  kind: "household",
  householdId: "h1",
  memberUserIds: ["u1", "u2"],
  userId: "u1",
};

describe("scopeLabel", () => {
  it("returns 'Me' for a personal scope", () => {
    expect(scopeLabel(userScope)).toBe("Me");
  });

  it("returns the household name when provided", () => {
    expect(scopeLabel(householdScope, "Smiths")).toBe("Smiths");
  });

  it("falls back to 'Household' when no name is given", () => {
    expect(scopeLabel(householdScope)).toBe("Household");
  });
});

describe("scopeRowKey", () => {
  it("maps a user scope to scopeType=user and the user id", () => {
    expect(scopeRowKey(userScope)).toEqual({ scopeType: "user", scopeId: "u1" });
  });

  it("maps a household scope to scopeType=household and the household id", () => {
    expect(scopeRowKey(householdScope)).toEqual({ scopeType: "household", scopeId: "h1" });
  });
});
