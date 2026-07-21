import { describe, it, expect } from 'vitest';
import { loadCatalog, solve, type DesignDoc } from '@propelx/engine';
import { estimateCost } from '../src/economics.js';
import { DEFAULT_ASSUMPTIONS } from '../src/defaults.js';

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

describe('estimateCost — §10.1', () => {
  it('is zero on an invalid design', () => {
    const s = solve({ ...baseDesign(), stack: [] }, catalog);
    const c = estimateCost(baseDesign(), s, DEFAULT_ASSUMPTIONS, catalog);
    expect(c.vehicleUsd).toBe(0);
  });

  it('kerolox/hydrolox produces sensible propellant + hardware totals', () => {
    const d = baseDesign();
    const s = solve(d, catalog);
    const c = estimateCost(d, s, DEFAULT_ASSUMPTIONS, catalog);
    expect(c.propellantUsd).toBeGreaterThan(0);
    expect(c.hardwareUsd).toBeGreaterThan(0);
    expect(c.vehicleUsd).toBeCloseTo(c.propellantUsd + c.hardwareUsd, 4);
    expect(c.costPerKgOrbitUsd).toBeGreaterThan(0);
    expect(c.perStage).toHaveLength(2);
  });

  it('reuse toggle drops cost/flight for high amortization', () => {
    const d = baseDesign();
    const s = solve(d, catalog);
    const noReuse = estimateCost(d, s, DEFAULT_ASSUMPTIONS, catalog);
    const withReuse = estimateCost(
      d,
      s,
      { ...DEFAULT_ASSUMPTIONS, reuse: { enabled: true, flightsAmortized: 20, stage1PenaltyFraction: 0.3 } },
      catalog,
    );
    expect(withReuse.costPerFlightUsd).toBeLessThan(noReuse.costPerFlightUsd);
  });

  it('assumption edits change cost outputs live (§10.4 test 4 premise)', () => {
    const d = baseDesign();
    const s = solve(d, catalog);
    const before = estimateCost(d, s, DEFAULT_ASSUMPTIONS, catalog);
    const bumped = {
      ...DEFAULT_ASSUMPTIONS,
      hardware_usd_per_kg_dry: {
        ...DEFAULT_ASSUMPTIONS.hardware_usd_per_kg_dry,
        kerolox: DEFAULT_ASSUMPTIONS.hardware_usd_per_kg_dry.kerolox * 2,
      },
    };
    const after = estimateCost(d, s, bumped, catalog);
    expect(after.hardwareUsd).toBeGreaterThan(before.hardwareUsd);
  });
});
