// Per-stage Isp override tests. Mirrors the tech-level (ε) override tests —
// the same pattern applied to a different archetype property.

import { describe, it, expect } from 'vitest';
import { loadCatalog, solve, sizeStage } from '../src/index.js';
import type { DesignDoc } from '../src/types.js';

const catalog = loadCatalog();

function baseDesign(): DesignDoc {
  return {
    schema_version: '1.0',
    mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 15_000, crewed: false },
    stack: [
      { position: 1, module_id: 'kerolox' },
      { position: 2, module_id: 'hydrolox' },
    ],
    allocation_mode: 'auto',
    manual_allocation_m_s: null,
  };
}

describe('per-stage Isp override', () => {
  it('sizeStage honours the isp override in either mode', () => {
    const mod = catalog.byId('hydrolox');
    // Baseline: vacuum Isp 450 s.
    const stock = sizeStage(mod, 3_000, 10_000, 'upper');
    const boosted = sizeStage(mod, 3_000, 10_000, 'upper', undefined, 500);
    expect(boosted.isp_used_s).toBe(500);
    expect(boosted.mp_kg).toBeLessThan(stock.mp_kg);

    // Stage-1 mode: override wins over the SL/vac blend too.
    const stock1 = sizeStage(mod, 3_000, 10_000, 'stage1');
    const boosted1 = sizeStage(mod, 3_000, 10_000, 'stage1', undefined, 500);
    expect(boosted1.isp_used_s).toBe(500);
    expect(boosted1.mp_kg).toBeLessThan(stock1.mp_kg);
  });

  it('boosting hydrolox Isp reduces GLOW at the same mission target', () => {
    const stock = solve(baseDesign(), catalog);
    const boosted = baseDesign();
    boosted.stack[1] = { ...boosted.stack[1]!, isp_override_s: 500 };
    const better = solve(boosted, catalog);
    expect(stock.valid && better.valid).toBe(true);
    expect(better.glow_kg).toBeLessThan(stock.glow_kg);
  });

  it('an extreme Isp on a single kerolox stage makes it close to LEO alone', () => {
    // Baseline: single kerolox to LEO fails V-5 (spec §9 test 1).
    const single = solve(
      {
        ...baseDesign(),
        stack: [{ position: 1, module_id: 'kerolox' }],
      },
      catalog,
    );
    expect(single.valid).toBe(false);
    // Give the stage impossibly good ion-class Isp — now it should close.
    const upgraded = solve(
      {
        ...baseDesign(),
        stack: [{ position: 1, module_id: 'kerolox', isp_override_s: 3_000 }],
      },
      catalog,
    );
    expect(upgraded.valid).toBe(true);
  });

  it('override matching archetype value reproduces the stock result', () => {
    const design = baseDesign();
    design.stack[1] = { ...design.stack[1]!, isp_override_s: 450 }; // hydrolox vac
    const a = solve(baseDesign(), catalog);
    const b = solve(design, catalog);
    // Stage 2's Isp is unchanged (450 in either); Stage 1 is unchanged too.
    // GLOW should match to 3 decimals.
    expect(a.glow_kg).toBeCloseTo(b.glow_kg, 3);
  });

  it('is deterministic', () => {
    const d = {
      ...baseDesign(),
      stack: [
        { position: 1, module_id: 'kerolox' as const, isp_override_s: 320 },
        { position: 2, module_id: 'hydrolox' as const, isp_override_s: 470 },
      ],
    };
    const a = solve(d, catalog);
    const b = solve(d, catalog);
    expect(a).toEqual(b);
  });
});
