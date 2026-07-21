// Structural-fraction override (PLAN §6 Q2). Reducing ε should improve
// payload fraction; increasing it should degrade it. Bounds are enforced
// by the UI — the engine trusts whatever it's given.

import { describe, it, expect } from 'vitest';
import { loadCatalog, solve } from '../src/index.js';
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

describe('structural-fraction override', () => {
  it('reducing ε improves payload fraction', () => {
    const stock = solve(baseDesign(), catalog);

    const lightweight: DesignDoc = baseDesign();
    // Balloon-tank-class upper stage.
    lightweight.stack[1] = { ...lightweight.stack[1]!, structural_fraction_override: 0.05 };
    const better = solve(lightweight, catalog);

    expect(stock.valid && better.valid).toBe(true);
    expect(better.payload_fraction).toBeGreaterThan(stock.payload_fraction);
  });

  it('increasing ε degrades payload fraction', () => {
    const stock = solve(baseDesign(), catalog);

    const heavy: DesignDoc = baseDesign();
    heavy.stack[1] = { ...heavy.stack[1]!, structural_fraction_override: 0.25 };
    const worse = solve(heavy, catalog);

    expect(stock.valid && worse.valid).toBe(true);
    expect(worse.payload_fraction).toBeLessThan(stock.payload_fraction);
  });

  it('leaving override undefined reproduces the archetype behaviour', () => {
    const explicit: DesignDoc = baseDesign();
    explicit.stack[0] = {
      ...explicit.stack[0]!,
      structural_fraction_override: catalog.byId('kerolox').structural_fraction,
    };
    const a = solve(baseDesign(), catalog);
    const b = solve(explicit, catalog);
    expect(a.glow_kg).toBeCloseTo(b.glow_kg, 3);
  });

  it('too-large ε triggers V-5 (tank-growth spiral)', () => {
    const single: DesignDoc = {
      ...baseDesign(),
      stack: [
        {
          position: 1,
          module_id: 'kerolox',
          structural_fraction_override: 0.30, // heavy-steel tanks
        },
      ],
    };
    // A single-stage kerolox to LEO already fails; heavy ε keeps it failing.
    const r = solve(single, catalog);
    expect(r.valid).toBe(false);
    expect(r.violations.some((v) => v.rule === 'V-5')).toBe(true);
  });
});
