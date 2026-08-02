import { describe, it, expect } from "vitest";
import { THEME_PRESETS, getPreset, DEFAULT_LIGHT, DEFAULT_DARK } from "./presets";

describe("theme/presets", () => {
  it("has 6 built-in presets", () => {
    expect(THEME_PRESETS).toHaveLength(6);
  });

  it("each preset has unique id", () => {
    const ids = THEME_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each preset has light and dark colors", () => {
    THEME_PRESETS.forEach((p) => {
      expect(p.colors).toBeDefined();
      expect(p.colors.primary).toBeDefined();
      expect(p.darkColors).toBeDefined();
      expect(p.darkColors?.primary).toBeDefined();
    });
  });

  it("default preset is first", () => {
    expect(THEME_PRESETS[0].id).toBe("default");
    expect(THEME_PRESETS[0].name).toBe("DBoard Blue");
  });

  it("DEFAULT_LIGHT has all required color keys", () => {
    const keys = [
      "primary", "primaryForeground", "secondary", "secondaryForeground",
      "accent", "accentForeground", "destructive", "destructiveForeground",
      "muted", "mutedForeground", "background", "foreground",
      "card", "cardForeground", "border", "input", "ring",
      "success", "warning", "info",
    ];
    keys.forEach((key) => {
      expect(DEFAULT_LIGHT[key as keyof typeof DEFAULT_LIGHT]).toBeDefined();
    });
  });

  it("DEFAULT_DARK has all required color keys", () => {
    const keys = [
      "primary", "primaryForeground", "secondary", "secondaryForeground",
      "accent", "accentForeground", "destructive", "destructiveForeground",
      "muted", "mutedForeground", "background", "foreground",
      "card", "cardForeground", "border", "input", "ring",
      "success", "warning", "info",
    ];
    keys.forEach((key) => {
      expect(DEFAULT_DARK[key as keyof typeof DEFAULT_DARK]).toBeDefined();
    });
  });

  describe("getPreset", () => {
    it("returns correct preset", () => {
      const p = getPreset("emerald");
      expect(p?.name).toBe("Emerald");
    });

    it("returns undefined for unknown", () => {
      expect(getPreset("nonexistent")).toBeUndefined();
    });
  });
});
