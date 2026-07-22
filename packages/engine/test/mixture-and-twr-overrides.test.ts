// Per-stage mixture-ratio and max-TWR override tests. Same pattern as
// the tech-level and Isp overrides — user-authored values applied on top
// of the archetype for engineering "what-if" exploration.

import { describe, it, expect } from 'vitest';
import { loadCatalog, solve } from '../src/index.js';
import type { DesignDoc } from '../src/types.js';

const catalog = loadCatalog();

function twoStage(): DesignDoc {
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

describe('mixture-ratio override', () => {
  it('total propellant is unchanged; only the fuel/ox split moves', () => {
    const stock = solve(twoStage(), catalog);
    const changed: DesignDoc = twoStage();
    changed.stack[0] = { ...changed.stack[0]!, mixture_ratio_override: 3.0 };
    const alt = solve(changed, catalog);
    expect(stock.valid && alt.valid).toBe(true);
    // Same GLOW to 6 decimals — MR does not enter the sizing equation.
    expect(alt.glow_kg).toBeCloseTo(stock.glow_kg, 6);
    // Same total propellant.
    expect(alt.stages[0]!.propellant_kg).toBeCloseTo(stock.stages[0]!.propellant_kg, 6);
    // But fuel/ox split differs.
    expect(alt.stages[0]!.fuel_kg).not.toBeCloseTo(stock.stages[0]!.fuel_kg, 3);
    // MR = 3.0 → fuel = mp / (1+3) = mp/4; ox = 3·mp/4.
    const mp = alt.stages[0]!.propellant_kg;
    expect(alt.stages[0]!.fuel_kg).toBeCloseTo(mp / 4, 6);
    expect(alt.stages[0]!.oxidizer_kg).toBeCloseTo((3 * mp) / 4, 6);
  });

  it('changes the tank-volume readout to match the new split', () => {
    const stock = solve(twoStage(), catalog);
    const changed: DesignDoc = twoStage();
    // Bump ox:fuel from 2.3 → 6.0. Kerolox: fuel_dens 810, ox_dens 1141.
    // Higher MR → more (denser) oxidiser + less fuel → different total volume.
    changed.stack[0] = { ...changed.stack[0]!, mixture_ratio_override: 6.0 };
    const alt = solve(changed, catalog);
    expect(alt.stages[0]!.tank_volume_m3).not.toBeCloseTo(stock.stages[0]!.tank_volume_m3, 3);
  });

  it('is ignored on solid / ion / cold-gas archetypes (no oxidiser)', () => {
    const design: DesignDoc = {
      ...twoStage(),
      stack: [
        {
          position: 1,
          module_id: 'solid',
          // Bogus override — engine should ignore it since solids are monobase.
          mixture_ratio_override: 5,
        },
        { position: 2, module_id: 'hydrolox' },
      ],
      // Solids alone can't hit LEO Δv; use a low custom Δv to keep it feasible.
      mission: { destination: 'CUSTOM', delta_v_m_s: 3_000, payload_kg: 200, crewed: false },
    };
    const r = solve(design, catalog);
    expect(r.valid).toBe(true);
    // Solids have no oxidizer split.
    expect(r.stages[0]!.oxidizer_kg).toBe(0);
    expect(r.stages[0]!.fuel_kg).toBeCloseTo(r.stages[0]!.propellant_kg, 6);
  });
});

describe('max-TWR override', () => {
  it('raising Stage 1 max TWR clears the V-4 hydrolox thrust-poor warning', () => {
    const stock = solve(
      {
        ...twoStage(),
        stack: [
          { position: 1, module_id: 'hydrolox' },
          { position: 2, module_id: 'hydrolox' },
        ],
      },
      catalog,
    );
    // Without override, hydrolox first stage triggers V-4 warning.
    expect(stock.warnings.some((w) => w.rule === 'V-4' && /thrust-poor/.test(w.message))).toBe(true);

    const boosted = solve(
      {
        ...twoStage(),
        stack: [
          { position: 1, module_id: 'hydrolox', max_twr_override: 2.5 },
          { position: 2, module_id: 'hydrolox' },
        ],
      },
      catalog,
    );
    expect(boosted.warnings.some((w) => w.rule === 'V-4' && /thrust-poor/.test(w.message))).toBe(false);
  });

  it('lowering Stage 1 max TWR below 1.2 triggers a V-4 hard fail', () => {
    const r = solve(
      {
        ...twoStage(),
        stack: [
          { position: 1, module_id: 'kerolox', max_twr_override: 0.9 },
          { position: 2, module_id: 'hydrolox' },
        ],
      },
      catalog,
    );
    expect(r.violations.some((v) => v.rule === 'V-4')).toBe(true);
  });

  it('twr_ignition on the stage result reflects the override', () => {
    const design: DesignDoc = twoStage();
    design.stack[0] = { ...design.stack[0]!, max_twr_override: 2.2 };
    const r = solve(design, catalog);
    expect(r.stages[0]!.twr_ignition).toBe(2.2);
  });

  it('is deterministic', () => {
    const d: DesignDoc = twoStage();
    d.stack[0] = {
      ...d.stack[0]!,
      max_twr_override: 2.0,
      mixture_ratio_override: 2.8,
    };
    const a = solve(d, catalog);
    const b = solve(d, catalog);
    expect(a).toEqual(b);
  });
});
