import { describe, expect, it } from "vitest";
import { csvField, csvRow } from "./csv";

describe("csvField", () => {
  it("renders null/undefined as empty", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });

  it("passes plain strings through unquoted", () => {
    expect(csvField("hello")).toBe("hello");
  });

  it("quotes fields containing commas", () => {
    expect(csvField("a,b")).toBe('"a,b"');
  });

  it("quotes and escapes internal double quotes", () => {
    expect(csvField('she said "hi"')).toBe('"she said ""hi"""');
  });

  it("quotes fields containing newlines", () => {
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("stringifies numbers", () => {
    expect(csvField(-12.5)).toBe("-12.5");
  });
});

describe("csvRow", () => {
  it("joins fields with commas", () => {
    expect(csvRow(["a", "b", "c"])).toBe("a,b,c");
  });

  it("escapes per-field", () => {
    expect(csvRow(["plain", "has,comma", 'with"quote'])).toBe(
      'plain,"has,comma","with""quote"',
    );
  });
});
