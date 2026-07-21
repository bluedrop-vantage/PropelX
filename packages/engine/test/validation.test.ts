import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../src/catalog.js';
import {
  runPreSizingRules,
  runPostSizingRules,
  type SizedStageForValidation,
} from '../src/validation.js';
import type { DesignDoc, ModuleId } from '../src/types.js';

const catalog = loadCatalog();

function design(overrides: Partial<DesignDoc> = {}): DesignDoc {
  return {
    schema_version: '1.0',
    mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 3_500, crewed: false },
    stack: [{ position: 1, module_id: 'kerolox' }],
    allocation_mode: 'auto',
    manual_allocation_m_s: null,
    ...overrides,
  };
}

function sized(items: Array<{ id: ModuleId; mp: number; ms: number; feasible?: boolean; reason?: string }>) {
  const stages: SizedStageForValidation[] = [];
  let above = 3_500;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]!;
    const mod = catalog.byId(it.id);
    stages[i] = {
      position: i + 1,
      module: mod,
      mp_kg: it.mp,
      ms_kg: it.ms,
      massAboveIncl_kg: above + it.mp + it.ms,
      feasible: it.feasible ?? true,
      feasibilityReason: it.reason,
    };
    above = above + it.mp + it.ms;
  }
  return { stages, glow: above };
}

describe('pre-sizing rules', () => {
  it('V-1: empty stack fails', () => {
    const out = runPreSizingRules({ design: design({ stack: [] }), catalog });
    expect(out.violations.some((v) => v.rule === 'V-1')).toBe(true);
  });

  it('V-1: 5 stages passes; 6 stages fails', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ position: i + 1, module_id: 'kerolox' as ModuleId }));
    const six = Array.from({ length: 6 }, (_, i) => ({ position: i + 1, module_id: 'kerolox' as ModuleId }));
    expect(runPreSizingRules({ design: design({ stack: five }), catalog }).violations.filter((v) => v.rule === 'V-1')).toHaveLength(0);
    expect(runPreSizingRules({ design: design({ stack: six }), catalog }).violations.some((v) => v.rule === 'V-1')).toBe(true);
  });

  it('V-2: out-of-bounds payload fails', () => {
    const zero = runPreSizingRules({ design: design({ mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 0, crewed: false } }), catalog });
    const huge = runPreSizingRules({ design: design({ mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 500_000, crewed: false } }), catalog });
    expect(zero.violations.some((v) => v.rule === 'V-2')).toBe(true);
    expect(huge.violations.some((v) => v.rule === 'V-2')).toBe(true);
  });

  it('V-3: ion first stage fails with the millinewton message (§9 test 4)', () => {
    const out = runPreSizingRules({ design: design({ stack: [{ position: 1, module_id: 'ion' }] }), catalog });
    const v3 = out.violations.find((v) => v.rule === 'V-3');
    expect(v3).toBeDefined();
    expect(v3!.message).toMatch(/millinewton/);
  });

  it('V-3: kerolox first stage passes', () => {
    const out = runPreSizingRules({ design: design(), catalog });
    expect(out.violations.some((v) => v.rule === 'V-3')).toBe(false);
  });

  it('V-7: crewed + all-solid fails (§9 test 5)', () => {
    const out = runPreSizingRules({
      design: design({
        mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 9_500, crewed: true },
        stack: [
          { position: 1, module_id: 'solid' },
          { position: 2, module_id: 'solid' },
        ],
      }),
      catalog,
    });
    expect(out.violations.some((v) => v.rule === 'V-7')).toBe(true);
  });

  it('V-7: crewed + hypergolic upper produces a warning, not a violation', () => {
    const out = runPreSizingRules({
      design: design({
        mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 9_500, crewed: true },
        stack: [
          { position: 1, module_id: 'kerolox' },
          { position: 2, module_id: 'hypergolic' },
        ],
      }),
      catalog,
    });
    expect(out.warnings.some((w) => w.rule === 'V-7')).toBe(true);
    expect(out.violations.some((v) => v.rule === 'V-7')).toBe(false);
  });

  it('V-8: cold gas anywhere fails with the teaching message (§9 test 4)', () => {
    const out = runPreSizingRules({
      design: design({
        stack: [
          { position: 1, module_id: 'coldgas' },
          { position: 2, module_id: 'kerolox' },
        ],
      }),
      catalog,
    });
    const v8 = out.violations.find((v) => v.rule === 'V-8');
    expect(v8).toBeDefined();
    expect(v8!.message).toMatch(/never closes|tank mass/);
  });
});

describe('post-sizing rules', () => {
  it('V-4: hydrolox first stage without boosters emits a warning', () => {
    const { stages, glow } = sized([{ id: 'hydrolox', mp: 400_000, ms: 50_000 }]);
    const out = runPostSizingRules({ design: design({ stack: [{ position: 1, module_id: 'hydrolox' }] }), catalog, stages, glow_kg: glow });
    expect(out.warnings.some((w) => w.rule === 'V-4' && /thrust-poor/.test(w.message))).toBe(true);
    expect(out.violations.some((v) => v.rule === 'V-4')).toBe(false);
  });

  it('V-5: propagates per-stage infeasibility', () => {
    const { stages, glow } = sized([
      { id: 'kerolox', mp: 0, ms: 0, feasible: false, reason: 'tank-growth' },
    ]);
    const out = runPostSizingRules({ design: design(), catalog, stages, glow_kg: glow });
    expect(out.violations.some((v) => v.rule === 'V-5')).toBe(true);
  });

  it('V-6: ion upper stage triggers hard fail (TWR ≪ 0.4)', () => {
    const { stages, glow } = sized([
      { id: 'kerolox', mp: 300_000, ms: 20_000 },
      { id: 'ion', mp: 500, ms: 200 },
    ]);
    const out = runPostSizingRules({
      design: design({
        stack: [
          { position: 1, module_id: 'kerolox' },
          { position: 2, module_id: 'ion' },
        ],
      }),
      catalog,
      stages,
      glow_kg: glow,
    });
    expect(out.violations.some((v) => v.rule === 'V-6')).toBe(true);
  });
});
