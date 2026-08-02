export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  muted: string;
  mutedForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  border: string;
  input: string;
  ring: string;
  success: string;
  warning: string;
  info: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  darkColors?: Partial<ThemeColors>;
}

export interface CustomTheme {
  id: string;
  name: string;
  description: string;
  presetId: string;
  overrides: Partial<ThemeColors>;
  darkOverrides?: Partial<ThemeColors>;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeConfig {
  activePreset: string;
  customThemes: CustomTheme[];
  activeCustomTheme?: string;
  mode: "light" | "dark" | "system";
}
