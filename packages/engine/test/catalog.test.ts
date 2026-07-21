import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../src/catalog.js';
import type { ModuleId } from '../src/types.js';

describe('catalog', () => {
  const catalog = loadCatalog();

  it('has version 1.0', () => {
    expect(catalog.catalog_version).toBe('1.0');
  });

  it('contains all seven spec §3.1 modules', () => {
    const expected: ModuleId[] = [
      'solid',
      'kerolox',
      'methalox',
      'hydrolox',
      'hypergolic',
      'coldgas',
      'ion',
    ];
    const ids = catalog.modules.map((m) => m.id);
    for (const id of expected) {
      expect(ids).toContain(id);
    }
  });

  it('is frozen (byId returns immutable modules)', () => {
    const kerolox = catalog.byId('kerolox');
    expect(Object.isFrozen(kerolox)).toBe(true);
    expect(() => {
      (kerolox as { isp_vac_s: number }).isp_vac_s = 999;
    }).toThrow();
  });

  it('marks coldgas and ion as non-lift-capable', () => {
    expect(catalog.byId('coldgas').lift_capable).toBe(false);
    expect(catalog.byId('ion').lift_capable).toBe(false);
  });

  it('marks solid as non-restartable, non-throttleable', () => {
    const solid = catalog.byId('solid');
    expect(solid.restartable).toBe(false);
    expect(solid.throttleable).toBe(false);
  });

  it('has kerolox spec §3.1 numbers', () => {
    const kerolox = catalog.byId('kerolox');
    expect(kerolox.isp_sl_s).toBe(300);
    expect(kerolox.isp_vac_s).toBe(340);
    expect(kerolox.structural_fraction).toBe(0.06);
    expect(kerolox.mixture_ratio_ox_to_fuel).toBe(2.3);
  });

  it('throws on unknown id', () => {
    expect(() => catalog.byId('nonexistent' as ModuleId)).toThrow();
  });
});
