"use client";

import type { WidgetDefinition, WidgetPlugin } from "./types";

const widgetRegistry = new Map<string, WidgetDefinition>();
const widgetPlugins = new Map<string, WidgetPlugin>();

function registerWidget(widget: WidgetDefinition): void {
  widgetRegistry.set(widget.id, widget);
}

export function registerWidgetPlugin(plugin: WidgetPlugin): void {
  if (widgetPlugins.has(plugin.id)) {
    console.warn(`Widget plugin "${plugin.id}" is already registered. Overwriting.`);
  }
  widgetPlugins.set(plugin.id, plugin);
  for (const widget of plugin.widgets) {
    registerWidget(widget);
  }
}

export function getWidget(id: string): WidgetDefinition | undefined {
  return widgetRegistry.get(id);
}

export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(widgetRegistry.values());
}

export function getWidgetsByCategory(category: WidgetDefinition["category"]): WidgetDefinition[] {
  return getAllWidgets().filter((w) => w.category === category);
}

export function getAllWidgetPlugins(): WidgetPlugin[] {
  return Array.from(widgetPlugins.values());
}

function BarChartWidget({ data, config }: { data: { columns: string[]; data: Record<string, unknown>[] }; config: Record<string, unknown> }) {
  const labelCol = data.columns[0];
  const valueCol = data.columns[1] || data.columns[0];
  const values = data.data.slice(0, (config.maxItems as number) || 30);
  const maxVal = values.reduce((max, r) => Math.max(max, Number(r[valueCol]) || 0), 1) || 1;
  const color = (config.color as string) || "hsl(213, 65%, 50%)";

  return (
    <div className="space-y-1.5 py-2">
      {values.map((row, i) => {
        const val = Number(row[valueCol]) || 0;
        const pct = Math.max((val / maxVal) * 100, 1);
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-24 truncate text-muted-foreground shrink-0">{String(row[labelCol] ?? "")}</span>
            <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
              <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="w-12 text-right tabular-nums text-muted-foreground">{val.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function PieChartWidget({ data, config }: { data: { columns: string[]; data: Record<string, unknown>[] }; config: Record<string, unknown> }) {
  const labelCol = data.columns[0];
  const valueCol = data.columns[1] || data.columns[0];
  const values = data.data.slice(0, (config.maxItems as number) || 10);
  const total = values.reduce((sum, r) => sum + (Number(r[valueCol]) || 0), 0) || 1;
  const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#06b6d4"];

  return (
    <div className="flex flex-wrap gap-3 py-2">
      {values.map((row, i) => {
        const val = Number(row[valueCol]) || 0;
        const pct = ((val / total) * 100).toFixed(1);
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="truncate max-w-[120px]">{String(row[labelCol] ?? "")}</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function LineChartWidget({ data, config }: { data: { columns: string[]; data: Record<string, unknown>[] }; config: Record<string, unknown> }) {
  const labelCol = data.columns[0];
  const valueCol = data.columns[1] || data.columns[0];
  const values = data.data.slice(0, (config.maxItems as number) || 30);
  const maxVal = values.reduce((max, r) => Math.max(max, Number(r[valueCol]) || 0), 1) || 1;
  const color = (config.color as string) || "#6366f1";
  const width = 400;
  const height = 120;
  const padding = 10;

  const points = values.map((row, i) => {
    const x = padding + (i / Math.max(values.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((Number(row[valueCol]) || 0) / maxVal) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="py-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[120px]" preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
        {values.map((row, i) => {
          const x = padding + (i / Math.max(values.length - 1, 1)) * (width - 2 * padding);
          const y = height - padding - ((Number(row[valueCol]) || 0) / maxVal) * (height - 2 * padding);
          return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground px-2 mt-1">
        <span>{String(values[0]?.[labelCol] ?? "")}</span>
        <span>{String(values[values.length - 1]?.[labelCol] ?? "")}</span>
      </div>
    </div>
  );
}

function TableWidget({ data, config }: { data: { columns: string[]; data: Record<string, unknown>[] }; config: Record<string, unknown> }) {
  const maxRows = (config.maxItems as number) || 20;
  return (
    <div className="overflow-auto max-h-[300px]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            {data.columns.map((col) => (
              <th key={col} className="text-left px-2 py-1.5 font-medium text-muted-foreground">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.data.slice(0, maxRows).map((row, i) => (
            <tr key={i} className="border-b border-border/40">
              {data.columns.map((col) => (
                <td key={col} className="px-2 py-1 font-mono text-[11px]">{formatVal(row[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SparklineWidget({ data, config }: { data: { columns: string[]; data: Record<string, unknown>[] }; config: Record<string, unknown> }) {
  const valueCol = data.columns[1] || data.columns[0];
  const values = data.data.slice(0, (config.maxItems as number) || 20).map((r) => Number(r[valueCol]) || 0);
  const maxVal = values.reduce((max, v) => Math.max(max, v), 1) || 1;
  const minVal = values.reduce((min, v) => Math.min(min, v), 0);
  const range = maxVal - minVal || 1;
  const color = (config.color as string) || "#6366f1";
  const width = 200;
  const height = 40;

  const points = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - ((v - minVal) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="py-2 flex items-center justify-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[200px] h-[40px]">
        <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
      </svg>
    </div>
  );
}

function HeatmapWidget({ data, config }: { data: { columns: string[]; data: Record<string, unknown>[] }; config: Record<string, unknown> }) {
  const labelCol = data.columns[0];
  const valueCol = data.columns[1] || data.columns[0];
  const values = data.data.slice(0, (config.maxItems as number) || 16);
  const maxVal = values.reduce((max, r) => Math.max(max, Number(r[valueCol]) || 0), 1) || 1;

  return (
    <div className="grid grid-cols-4 gap-1 py-2">
      {values.map((row, i) => {
        const val = Number(row[valueCol]) || 0;
        const intensity = Math.round((val / maxVal) * 100);
        return (
          <div
            key={i}
            className="aspect-square rounded flex flex-col items-center justify-center text-[10px]"
            style={{ backgroundColor: `hsl(213, 65%, ${50 - intensity * 0.3}%)`, color: intensity > 50 ? "white" : undefined }}
            title={`${String(row[labelCol] ?? "")}: ${val}`}
          >
            <span className="font-medium truncate w-full text-center px-0.5">{String(row[labelCol] ?? "").slice(0, 6)}</span>
            <span className="opacity-80">{val.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

registerWidget({
  id: "bar",
  name: "Bar Chart",
  description: "Horizontal bar chart for comparing values",
  version: "1.0.0",
  author: "DBoard",
  category: "chart",
  icon: "bar-chart",
  renderer: BarChartWidget,
  configSchema: [
    { key: "maxItems", label: "Max Items", type: "number", default: 30, min: 1, max: 100 },
    { key: "color", label: "Bar Color", type: "color", default: "hsl(213, 65%, 50%)" },
  ],
});

registerWidget({
  id: "pie",
  name: "Pie Chart",
  description: "Proportional pie chart with legend",
  version: "1.0.0",
  author: "DBoard",
  category: "chart",
  icon: "pie-chart",
  renderer: PieChartWidget,
  configSchema: [
    { key: "maxItems", label: "Max Slices", type: "number", default: 10, min: 2, max: 20 },
  ],
});

registerWidget({
  id: "line",
  name: "Line Chart",
  description: "Line chart with SVG rendering",
  version: "1.0.0",
  author: "DBoard",
  category: "chart",
  icon: "trending-up",
  renderer: LineChartWidget,
  configSchema: [
    { key: "maxItems", label: "Max Points", type: "number", default: 30, min: 2, max: 100 },
    { key: "color", label: "Line Color", type: "color", default: "#6366f1" },
  ],
});

registerWidget({
  id: "table",
  name: "Data Table",
  description: "Tabular data display",
  version: "1.0.0",
  author: "DBoard",
  category: "table",
  icon: "table",
  renderer: TableWidget,
  configSchema: [
    { key: "maxItems", label: "Max Rows", type: "number", default: 20, min: 1, max: 100 },
  ],
});

registerWidget({
  id: "sparkline",
  name: "Sparkline",
  description: "Compact inline trend line",
  version: "1.0.0",
  author: "DBoard",
  category: "visualization",
  icon: "activity",
  renderer: SparklineWidget,
  configSchema: [
    { key: "maxItems", label: "Max Points", type: "number", default: 20, min: 2, max: 50 },
    { key: "color", label: "Line Color", type: "color", default: "#6366f1" },
  ],
});

registerWidget({
  id: "heatmap",
  name: "Heatmap Grid",
  description: "Color-coded grid for density visualization",
  version: "1.0.0",
  author: "DBoard",
  category: "visualization",
  icon: "grid",
  renderer: HeatmapWidget,
  configSchema: [
    { key: "maxItems", label: "Max Cells", type: "number", default: 16, min: 4, max: 36 },
  ],
});

let pluginsLoaded = false;

export async function loadExternalWidgets(): Promise<void> {
  if (pluginsLoaded) return;
  pluginsLoaded = true;

  const candidates = [
    "@dboard/widget-geo-map",
    "@dboard/widget-network-graph",
    "@dboard/widget-gauge",
    "@dboard/widget-treemap",
    "dboard-widget-geo-map",
    "dboard-widget-network-graph",
    "dboard-widget-gauge",
    "dboard-widget-treemap",
  ];

  for (const pkg of candidates) {
    try {
      const mod = await import(/* webpackIgnore: true */ pkg).catch(() => null);
      if (mod && typeof mod.register === "function") {
        mod.register({ register: registerWidgetPlugin });
      } else if (mod && mod.default) {
        registerWidgetPlugin(mod.default);
      }
    } catch {
      // Package not installed
    }
  }
}
