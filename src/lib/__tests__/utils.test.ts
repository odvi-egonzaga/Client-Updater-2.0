import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should handle undefined and null values", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("should handle empty strings", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("should merge Tailwind classes correctly - later classes should override earlier ones", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle arrays of classes", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("should handle objects with conditional classes", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("should handle mixed input types", () => {
    expect(cn("foo", { bar: true }, ["baz"], undefined)).toBe("foo bar baz");
  });

  it("should handle conflicting Tailwind utility classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should handle responsive classes", () => {
    expect(cn("px-2", "md:px-4", "lg:px-6")).toBe("px-2 md:px-4 lg:px-6");
  });

  it("should return empty string when no valid classes provided", () => {
    expect(cn("", false, null, undefined)).toBe("");
  });

  it("should handle numbers converted to strings", () => {
    expect(cn("foo", 123 as any)).toBe("foo 123");
  });
});
