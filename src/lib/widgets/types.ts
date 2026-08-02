import type { ComponentType } from "react";

export interface WidgetData {
  columns: string[];
  data: Record<string, unknown>[];
}

export interface WidgetRendererProps {
  data: WidgetData;
  config: Record<string, unknown>;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  homepage?: string;
  category: "chart" | "visualization" | "table" | "custom";
  icon: string;
  renderer: ComponentType<WidgetRendererProps>;
  defaultConfig?: Record<string, unknown>;
  configSchema?: WidgetConfigField[];
}

export interface WidgetConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "color";
  default: unknown;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
}

export interface WidgetPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  widgets: WidgetDefinition[];
}
