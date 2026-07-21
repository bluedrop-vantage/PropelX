// Catalog loader. Freezes the loaded catalog so downstream code cannot mutate it.
// Spec §8.1.

import type { Catalog, CatalogModule, ModuleId } from './types.js';
import catalogJson from '../data/catalog.v1.json' with { type: 'json' };

function freezeDeep<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  Object.values(value as Record<string, unknown>).forEach((v) => freezeDeep(v));
  return Object.freeze(value) as T;
}

const modules = catalogJson.modules as CatalogModule[];
const byIdMap = new Map<ModuleId, CatalogModule>(modules.map((m) => [m.id, m]));

export function loadCatalog(): Catalog {
  const frozenModules = modules.map((m) => freezeDeep(m));
  const catalog: Catalog = {
    catalog_version: catalogJson.catalog_version,
    modules: Object.freeze(frozenModules),
    byId(id: ModuleId): CatalogModule {
      const m = byIdMap.get(id);
      if (!m) throw new Error(`Unknown module id: ${id}`);
      return m;
    },
  };
  return Object.freeze(catalog);
}
