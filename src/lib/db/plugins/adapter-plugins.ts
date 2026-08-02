import type { DatabaseAdapter, AdapterPlugin } from "../drivers/types";

const adapterPlugins = new Map<string, AdapterPlugin>();

export function registerAdapterPlugin(plugin: AdapterPlugin): void {
  if (adapterPlugins.has(plugin.id)) {
    console.warn(`Adapter plugin "${plugin.id}" is already registered. Overwriting.`);
  }
  adapterPlugins.set(plugin.id, plugin);
}

export function getAdapterPlugin(id: string): AdapterPlugin | undefined {
  return adapterPlugins.get(id);
}

export function getAllAdapterPlugins(): AdapterPlugin[] {
  return Array.from(adapterPlugins.values());
}

export function createPluginAdapter(pluginId: string): DatabaseAdapter {
  const plugin = adapterPlugins.get(pluginId);
  if (!plugin) {
    throw new Error(`Adapter plugin "${pluginId}" not found. Available: ${Array.from(adapterPlugins.keys()).join(", ")}`);
  }
  return plugin.createAdapter();
}

export function isPluginAdapter(pluginId: string): boolean {
  return adapterPlugins.has(pluginId);
}

let loadAttempted = false;
const loadedPackages = new Set<string>();

export async function loadExternalAdapters(): Promise<void> {
  if (loadAttempted) return;
  loadAttempted = true;

  const candidates = [
    "@dboard/adapter-clickhouse",
    "@dboard/adapter-dynamodb",
    "@dboard/adapter-firestore",
    "@dboard/adapter-redis",
    "@dboard/adapter-cassandra",
    "dboard-adapter-clickhouse",
    "dboard-adapter-dynamodb",
    "dboard-adapter-firestore",
    "dboard-adapter-redis",
    "dboard-adapter-cassandra",
  ];

  for (const pkg of candidates) {
    if (loadedPackages.has(pkg)) continue;
    try {
      const mod = await import(/* webpackIgnore: true */ pkg).catch(() => null);
      if (mod && typeof mod.register === "function") {
        mod.register({ register: registerAdapterPlugin });
        loadedPackages.add(pkg);
      } else if (mod && mod.default) {
        registerAdapterPlugin(mod.default);
        loadedPackages.add(pkg);
      }
    } catch {
      // Package not installed — expected in most deployments
    }
  }
}

export function clearAdapterPlugins(): void {
  adapterPlugins.clear();
  loadAttempted = false;
  loadedPackages.clear();
}
