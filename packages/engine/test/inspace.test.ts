// In-space mission mode (PLAN §6 Q3).
// Verifies that lift-only validation rules are skipped, all stages use
// vacuum Isp, and ion / cold-gas become legitimate stack choices.

import { describe, it, expect } from 'vitest';
import { loadCatalog, solve, DESTINATION_DELTA_V_M_S } from '../src/index.js';
import type { DesignDoc } from '../src/types.js';

const catalog = loadCatalog();

function design(overrides: Partial<DesignDoc> = {}): DesignDoc {
  return {
    schema_version: '1.0',
    mission: {
      type: 'in-space',
      destination: 'LEO_TO_GTO',
      delta_v_m_s: DESTINATION_DELTA_V_M_S.LEO_TO_GTO,
      payload_kg: 1_000,
      crewed: false,
    },
    stack: [{ position: 1, module_id: 'methalox' }],
    allocation_mode: 'auto',
    manual_allocation_m_s: null,
  };
}

describe('in-space mission mode', () => {
  it('ion first stage is legal in space (V-3 skipped)', () => {
    const r = solve(design({ stack: [{ position: 1, module_id: 'ion' }] }), catalog);
    // No V-3 violation.
    expect(r.violations.filter((v) => v.rule === 'V-3')).toHaveLength(0);
  });

  it('cold-gas kick stage is legal in space (V-8 skipped)', () => {
    const r = solve(
      design({
        stack: [
          { position: 1, module_id: 'coldgas' },
          { position: 2, module_id: 'methalox' },
        ],
      }),
      catalog,
    );
    expect(r.violations.filter((v) => v.rule === 'V-8')).toHaveLength(0);
  });

  it('methalox to LEO_TO_GTO closes and produces sensible propellant mass', () => {
    const r = solve(design(), catalog);
    expect(r.valid).toBe(true);
    expect(r.stages).toHaveLength(1);
    expect(r.stages[0]!.propellant_kg).toBeGreaterThan(0);
  });

  it('all stages use vacuum Isp when mission is in-space', () => {
    const r = solve(design(), catalog);
    expect(r.valid).toBe(true);
    // methalox vacuum Isp = 365 s per catalog. Stage 1 in launch mode would
    // be 0.85*330 + 0.15*365 ≈ 335.25 s. In-space must be 365.
    expect(r.stages[0]!.isp_used_s).toBeCloseTo(365, 5);
  });

  it('in-space design ignores strap-on boosters', () => {
    const r = solve(
      design({
        stack: [
          {
            position: 1,
            module_id: 'methalox',
            boosters: { module_id: 'solid', count: 4 },
          },
        ],
      }),
      catalog,
    );
    expect(r.valid).toBe(true);
    expect(r.booster).toBeUndefined();
  });

  it('launch-mode validation still runs when mission.type is unset (back-compat)', () => {
    const r = solve(
      {
        schema_version: '1.0',
        mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 1_000, crewed: false },
        stack: [{ position: 1, module_id: 'ion' }],
        allocation_mode: 'auto',
        manual_allocation_m_s: null,
      },
      catalog,
    );
    // No mission.type = launch by default; V-3 must fire.
    expect(r.violations.some((v) => v.rule === 'V-3')).toBe(true);
  });
});
