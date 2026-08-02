"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  THEME_PRESETS, DEFAULT_LIGHT, DEFAULT_DARK,
} from "@/lib/theme/presets";
import {
  getActiveThemeColors, applyTheme, setActivePreset, setThemeMode,
  getThemeMode, createCustomTheme, getCustomThemes, deleteCustomTheme,
  setActiveCustomTheme,
} from "@/lib/theme/store";
import {
  Palette, Check, Plus, Trash2, Sun, Moon, Monitor, RotateCcw,
} from "lucide-react";

const COLOR_FIELDS: { key: string; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "primaryForeground", label: "Primary Text" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "destructive", label: "Destructive" },
  { key: "muted", label: "Muted" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "card", label: "Card" },
  { key: "border", label: "Border" },
  { key: "ring", label: "Ring" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "info", label: "Info" },
];

function hslToHex(hsl: string): string {
  const parts = hsl.split(" ").map(Number);
  if (parts.length < 3) return "#000000";
  const [h, s, l] = parts;
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function ThemeEditor() {
  const [activePreset, setActivePresetState] = useState("default");
  const [mode, setModeState] = useState<"light" | "dark" | "system">("system");
  const [customOverrides, setCustomOverrides] = useState<Record<string, string>>({});
  const [customThemes, setCustomThemes] = useState<ReturnType<typeof getCustomThemes>>([]);
  const [showNewTheme, setShowNewTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setModeState(getThemeMode());
    setCustomThemes(getCustomThemes());
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const checkDark = () => {
      const m = getThemeMode();
      setIsDark(m === "dark" || (m === "system" && mq.matches));
    };
    checkDark();
    mq.addEventListener("change", checkDark);
    return () => mq.removeEventListener("change", checkDark);
  }, [mode]);

  const refreshTheme = useCallback(() => {
    const colors = getActiveThemeColors(isDark);
    applyTheme(colors);
    setCustomThemes(getCustomThemes());
  }, [isDark]);

  useEffect(() => { refreshTheme(); }, [refreshTheme]);

  const handlePresetChange = (presetId: string) => {
    setActivePresetState(presetId);
    setActivePreset(presetId);
    setCustomOverrides({});
    refreshTheme();
  };

  const handleModeChange = (newMode: "light" | "dark" | "system") => {
    setModeState(newMode);
    setThemeMode(newMode);
  };

  const handleColorChange = (key: string, hex: string) => {
    setCustomOverrides((prev) => ({ ...prev, [key]: hexToHsl(hex) }));
    const colors = getActiveThemeColors(isDark);
    applyTheme({ ...colors, ...Object.fromEntries(Object.entries(customOverrides).map(([k, v]) => [k, v])) , [key]: hexToHsl(hex) });
  };

  const handleSaveCustomTheme = () => {
    if (!newThemeName.trim()) return;
    const theme = createCustomTheme(newThemeName.trim(), `Custom theme based on ${activePreset}`, activePreset, customOverrides);
    setActiveCustomTheme(theme.id);
    setCustomThemes(getCustomThemes());
    setShowNewTheme(false);
    setNewThemeName("");
  };

  const handleDeleteCustomTheme = (id: string) => {
    deleteCustomTheme(id);
    setCustomThemes(getCustomThemes());
    refreshTheme();
  };

  const handleApplyCustomTheme = (id: string) => {
    setActiveCustomTheme(id);
    refreshTheme();
  };

  const handleReset = () => {
    setActivePreset("default");
    setActivePresetState("default");
    setCustomOverrides({});
    refreshTheme();
  };

  const currentColors = getActiveThemeColors(isDark);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Appearance Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { value: "light" as const, icon: Sun, label: "Light" },
              { value: "dark" as const, icon: Moon, label: "Dark" },
              { value: "system" as const, icon: Monitor, label: "System" },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => handleModeChange(value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                  mode === value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Theme Presets</CardTitle>
              <CardDescription className="text-xs">Choose a color scheme as your starting point</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {THEME_PRESETS.map((preset) => {
              const previewColors = isDark ? { ...DEFAULT_DARK, ...preset.darkColors } : { ...DEFAULT_LIGHT, ...preset.colors };
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={`relative p-3 rounded-lg border text-left transition-all ${
                    activePreset === preset.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  {activePreset === preset.id && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className="flex gap-1 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${previewColors.primary})` }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${previewColors.secondary})` }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${previewColors.accent})` }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${previewColors.destructive})` }} />
                  </div>
                  <p className="text-xs font-medium">{preset.name}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Color Overrides</CardTitle>
              <CardDescription className="text-xs">Fine-tune individual colors</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowNewTheme(true)}>
              <Plus className="h-3 w-3" />
              Save as Theme
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {COLOR_FIELDS.map(({ key, label }) => {
              const hslValue = customOverrides[key] || (currentColors as unknown as Record<string, string>)[key] || "0 0% 50%";
              const hex = hslToHex(hslValue);
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div
                      className="w-7 h-7 rounded-md border border-border cursor-pointer"
                      style={{ backgroundColor: `hsl(${hslValue})` }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{label}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono">{hslValue}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {customThemes.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Custom Themes</CardTitle>
            <CardDescription className="text-xs">Your saved theme configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {customThemes.map((theme) => (
                <div key={theme.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{theme.name}</p>
                    <p className="text-[10px] text-muted-foreground/60">{theme.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleApplyCustomTheme(theme.id)}>
                      Apply
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive" onClick={() => handleDeleteCustomTheme(theme.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showNewTheme && (
        <Card className="shadow-sm border-primary/30">
          <CardContent className="pt-5">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Theme Name</Label>
                <Input
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="My Custom Theme"
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveCustomTheme(); }}
                />
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={handleSaveCustomTheme} disabled={!newThemeName.trim()}>
                Save
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewTheme(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
