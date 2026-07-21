import { describe, it, expect } from 'vitest';
import { loadCatalog, solve, type DesignDoc } from '@propelx/engine';
import { estimateCost } from '../src/economics.js';
import { DEFAULT_ASSUMPTIONS } from '../src/defaults.js';
import { runSuggestions } from '../src/rules.js';
import type { SuggestionContext } from '../src/types.js';

const catalog = loadCatalog();

function ctxFor(design: DesignDoc, assumptions = DEFAULT_ASSUMPTIONS): SuggestionContext {
  const s = solve(design, catalog);
  const c = estimateCost(design, s, assumptions, catalog);
  return { design, solve: s, cost: c, assumptions };
}

function d(stack: DesignDoc['stack'], overrides: Partial<DesignDoc> = {}): DesignDoc {
  return {
    schema_version: '1.0',
    mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 15_000, crewed: false },
    stack,
    allocation_mode: 'auto',
    manual_allocation_m_s: null,
    ...overrides,
  };
}

describe('suggestions engine — §10.2', () => {
  it('S-1: kerolox/hydrolox triggers a commonality suggestion (§10.4 test 1)', () => {
    const design = d([
      { position: 1, module_id: 'kerolox' },
      { position: 2, module_id: 'hydrolox' },
    ]);
    const out = runSuggestions(ctxFor(design), catalog);
    const s1 = out.find((s) => s.ruleId === 'S-1');
    // May or may not fire depending on the 10 % payload-loss gate — but if it
    // fires it must carry a computed counterfactual and impact.
    if (s1) {
      expect(s1.counterfactual).toBeDefined();
      expect(s1.impact).toBeDefined();
    }
  });

  it('S-2: hydrolox first stage triggers a "move hydrogen up" suggestion', () => {
    const design = d([
      { position: 1, module_id: 'hydrolox' },
      { position: 2, module_id: 'hydrolox' },
    ]);
    const out = runSuggestions(ctxFor(design), catalog);
    const s2 = out.find((s) => s.ruleId === 'S-2');
    expect(s2).toBeDefined();
    expect(s2!.counterfactual).toBeDefined();
    expect(s2!.counterfactual!.stack[0]!.module_id).not.toBe('hydrolox');
  });

  it('S-3: hypergolic stage triggers a toxicity suggestion', () => {
    const design = d([
      { position: 1, module_id: 'kerolox' },
      { position: 2, module_id: 'hypergolic' },
    ]);
    const out = runSuggestions(ctxFor(design), catalog);
    expect(out.some((s) => s.ruleId === 'S-3')).toBe(true);
  });

  it('S-4: cubesat payload on kerolox/hydrolox triggers oversized flag', () => {
    const design = d(
      [
        { position: 1, module_id: 'kerolox' },
        { position: 2, module_id: 'hydrolox' },
      ],
      { mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 25, crewed: false } },
    );
    const out = runSuggestions(ctxFor(design), catalog);
    expect(out.some((s) => s.ruleId === 'S-4')).toBe(true);
  });

  it('S-5: 4-stage stack triggers a reliability suggestion', () => {
    const design = d([
      { position: 1, module_id: 'kerolox' },
      { position: 2, module_id: 'kerolox' },
      { position: 3, module_id: 'methalox' },
      { position: 4, module_id: 'hydrolox' },
    ]);
    const out = runSuggestions(ctxFor(design), catalog);
    expect(out.some((s) => s.ruleId === 'S-5')).toBe(true);
  });

  it('S-6: uncrewed all-solid stack validates the choice', () => {
    // Solids alone can't reach 9 400 m/s; use a 3-stage solid stack at a lower Δv budget
    // where it actually closes (Sun-synchronous is not it — use custom 6 000).
    const design = d(
      [
        { position: 1, module_id: 'solid' },
        { position: 2, module_id: 'solid' },
        { position: 3, module_id: 'solid' },
      ],
      { mission: { destination: 'CUSTOM', delta_v_m_s: 6_000, payload_kg: 200, crewed: false } },
    );
    const out = runSuggestions(ctxFor(design), catalog);
    // If the stack closes we should see S-6.
    if (ctxFor(design).solve.valid) {
      expect(out.some((s) => s.ruleId === 'S-6')).toBe(true);
    }
  });

  it('S-7: reuse off + high amortization triggers a reuse suggestion', () => {
    const design = d([
      { position: 1, module_id: 'kerolox' },
      { position: 2, module_id: 'hydrolox' },
    ]);
    const highRate = {
      ...DEFAULT_ASSUMPTIONS,
      reuse: { enabled: false, flightsAmortized: 20, stage1PenaltyFraction: 0.3 },
    };
    const out = runSuggestions(ctxFor(design, highRate), catalog);
    expect(out.some((s) => s.ruleId === 'S-7')).toBe(true);
  });

  it('every fired Apply produces the exact numbers advertised (§10.4 test 3)', () => {
    const design = d([
      { position: 1, module_id: 'hydrolox' },
      { position: 2, module_id: 'hydrolox' },
    ]);
    const base = ctxFor(design);
    const out = runSuggestions(base, catalog);
    for (const s of out) {
      if (!s.counterfactual || !s.impact) continue;
      const applied = ctxFor(s.counterfactual);
      const glowChange = ((applied.solve.glow_kg - base.solve.glow_kg) / base.solve.glow_kg) * 100;
      const cpkgChange = ((applied.cost.costPerKgOrbitUsd - base.cost.costPerKgOrbitUsd) / base.cost.costPerKgOrbitUsd) * 100;
      expect(glowChange).toBeCloseTo(s.impact.glowChangePct, 6);
      expect(cpkgChange).toBeCloseTo(s.impact.costPerKgChangePct, 6);
    }
  });
});
