import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("utils", () => {
  it("merges class names", () => {
    const result = cn("foo", "bar");
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("deduplicates Tailwind classes", () => {
    const result = cn("px-4 py-2", "px-8");
    expect(result).toContain("px-8");
    expect(result).not.toContain("px-4");
    expect(result).toContain("py-2");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", true && "visible");
    expect(result).toContain("base");
    expect(result).toContain("visible");
    expect(result).not.toContain("hidden");
  });
});
