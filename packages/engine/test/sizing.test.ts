import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../src/catalog.js';
import { sizeStage, ispForMode } from '../src/sizing.js';
import { G0 } from '../src/constants.js';

const catalog = loadCatalog();

describe('sizeStage — closed form (§6.2)', () => {
  it('kerolox upper stage: Δv=3000 m/s over m_above=10 000 kg (hand-computed)', () => {
    const kerolox = catalog.byId('kerolox');
    const s = sizeStage(kerolox, 3000, 10_000, 'upper');
    // Reference: Ve = 340 * 9.80665 = 3334.261, R = exp(3000/Ve) ≈ 2.4506
    // k = 0.06/0.94 = 0.06383; denom = 1 - (R-1)*k = 0.9074
    // mp = (R-1)*10000 / denom ≈ 15 986 kg; ms ≈ 1 021 kg
    expect(s.feasible).toBe(true);
    expect(s.isp_used_s).toBeCloseTo(340, 5);
    expect(s.ve_m_s).toBeCloseTo(340 * G0, 5);
    expect(s.mass_ratio).toBeCloseTo(Math.exp(3000 / (340 * G0)), 6);
    expect(s.mp_kg).toBeGreaterThan(15_000);
    expect(s.mp_kg).toBeLessThan(17_000);
    expect(s.ms_kg / s.mp_kg).toBeCloseTo(0.06 / 0.94, 6);
    expect(s.m_above_below_kg).toBeCloseTo(10_000 + s.mp_kg + s.ms_kg, 6);
  });

  it('kerolox stage-1: uses 0.85·SL + 0.15·vac blend', () => {
    const kerolox = catalog.byId('kerolox');
    const isp = ispForMode(kerolox, 'stage1');
    expect(isp).toBeCloseTo(0.85 * 300 + 0.15 * 340, 6);
  });

  it('single kerolox stage cannot deliver 9 400 m/s alone (V-5 tank-growth)', () => {
    const kerolox = catalog.byId('kerolox');
    const s = sizeStage(kerolox, 9_400, 1_000, 'upper');
    expect(s.feasible).toBe(false);
    expect(s.reason).toMatch(/tanks outgrow its propellant/);
  });

  it('hydrolox upper stage delivers 5 000 m/s cleanly', () => {
    const hydrolox = catalog.byId('hydrolox');
    const s = sizeStage(hydrolox, 5_000, 5_000, 'upper');
    expect(s.feasible).toBe(true);
    expect(s.ms_kg / s.mp_kg).toBeCloseTo(0.11 / 0.89, 6);
  });

  it('mass-below equals m_above + mp + ms exactly', () => {
    const methalox = catalog.byId('methalox');
    const s = sizeStage(methalox, 4_000, 20_000, 'upper');
    expect(s.m_above_below_kg).toBe(20_000 + s.mp_kg + s.ms_kg);
  });
});
