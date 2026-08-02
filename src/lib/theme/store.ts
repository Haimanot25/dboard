"use client";

import type { ThemeColors, ThemeConfig, CustomTheme } from "./types";
import { DEFAULT_LIGHT, DEFAULT_DARK, getPreset } from "./presets";

const STORAGE_KEY = "dboard-theme-config";

function getConfig(): ThemeConfig {
  if (typeof window === "undefined") {
    return { activePreset: "default", customThemes: [], mode: "system" };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { activePreset: "default", customThemes: [], mode: "system" };
}

function saveConfig(config: ThemeConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getActiveThemeColors(isDark: boolean): ThemeColors {
  const config = getConfig();

  if (config.activeCustomTheme) {
    const custom = config.customThemes.find((t) => t.id === config.activeCustomTheme);
    if (custom) {
      const preset = getPreset(custom.presetId);
      if (preset) {
        const base = isDark ? { ...DEFAULT_DARK, ...preset.darkColors } : { ...DEFAULT_LIGHT, ...preset.colors };
        const overrides = isDark ? custom.darkOverrides : custom.overrides;
        return { ...base, ...overrides };
      }
    }
  }

  const preset = getPreset(config.activePreset);
  if (preset) {
    return isDark ? { ...DEFAULT_DARK, ...preset.darkColors } : { ...DEFAULT_LIGHT, ...preset.colors };
  }
  return isDark ? DEFAULT_DARK : DEFAULT_LIGHT;
}

export function applyTheme(colors: ThemeColors): void {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    root.style.setProperty(`--${cssVar}`, value);
  });
}

export function setActivePreset(presetId: string): void {
  const config = getConfig();
  config.activePreset = presetId;
  config.activeCustomTheme = undefined;
  saveConfig(config);
}

export function setThemeMode(mode: "light" | "dark" | "system"): void {
  const config = getConfig();
  config.mode = mode;
  saveConfig(config);
}

export function getThemeMode(): "light" | "dark" | "system" {
  return getConfig().mode;
}

export function createCustomTheme(name: string, description: string, presetId: string, overrides: Partial<ThemeColors>, darkOverrides?: Partial<ThemeColors>): CustomTheme {
  const config = getConfig();
  const theme: CustomTheme = {
    id: `custom-${Date.now()}`,
    name,
    description,
    presetId,
    overrides,
    darkOverrides,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  config.customThemes.push(theme);
  saveConfig(config);
  return theme;
}

export function updateCustomTheme(id: string, updates: Partial<Pick<CustomTheme, "name" | "description" | "overrides" | "darkOverrides">>): void {
  const config = getConfig();
  const theme = config.customThemes.find((t) => t.id === id);
  if (theme) {
    Object.assign(theme, updates, { updatedAt: new Date().toISOString() });
    saveConfig(config);
  }
}

export function deleteCustomTheme(id: string): void {
  const config = getConfig();
  config.customThemes = config.customThemes.filter((t) => t.id !== id);
  if (config.activeCustomTheme === id) {
    config.activeCustomTheme = undefined;
  }
  saveConfig(config);
}

export function setActiveCustomTheme(id: string): void {
  const config = getConfig();
  config.activeCustomTheme = id;
  saveConfig(config);
}

export function getCustomThemes(): CustomTheme[] {
  return getConfig().customThemes;
}

export function getThemeConfig(): ThemeConfig {
  return getConfig();
}
