import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../src/catalog.js';
import { autoAllocate, glowForAllocation, type StackModule } from '../src/allocator.js';

const catalog = loadCatalog();

function stackOf(ids: Array<'kerolox' | 'methalox' | 'hydrolox' | 'solid'>): StackModule[] {
  return ids.map((id, i) => ({
    module: catalog.byId(id),
    ispMode: i === 0 ? ('stage1' as const) : ('upper' as const),
  }));
}

describe('autoAllocate — §6.3', () => {
  it('single-stage returns the full Δv on that stage', () => {
    const stack = stackOf(['methalox']);
    const r = autoAllocate(stack, 3_000, 1_000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.allocation_m_s).toEqual([3_000]);
    }
  });

  it('single kerolox stage fails for 9 400 m/s (V-5)', () => {
    const stack = stackOf(['kerolox']);
    const r = autoAllocate(stack, 9_400, 3_500);
    expect(r.ok).toBe(false);
  });

  it('two-stage kerolox/kerolox: auto GLOW ≤ equal-split GLOW (§9 test 6)', () => {
    const stack = stackOf(['kerolox', 'kerolox']);
    const auto = autoAllocate(stack, 9_400, 3_500);
    expect(auto.ok).toBe(true);
    if (!auto.ok) return;
    const equal = glowForAllocation(stack, [4_700, 4_700], 3_500);
    expect(auto.glow_kg).toBeLessThanOrEqual(equal.glow_kg + 1e-3);
  });

  it('two-stage kerolox/hydrolox: allocator gives hydrolox the larger Δv share', () => {
    const stack = stackOf(['kerolox', 'hydrolox']);
    const r = autoAllocate(stack, 9_400, 3_500);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [dv1, dv2] = r.allocation_m_s as [number, number];
    // Hydrolox upper (Isp 450) should out-Δv the kerolox first stage (blended ~306).
    expect(dv2).toBeGreaterThan(dv1);
  });

  it('kerolox/hydrolox beats kerolox/kerolox at equal payload (§9 test 3)', () => {
    const both = autoAllocate(stackOf(['kerolox', 'hydrolox']), 9_400, 3_500);
    const kk = autoAllocate(stackOf(['kerolox', 'kerolox']), 9_400, 3_500);
    expect(both.ok && kk.ok).toBe(true);
    if (both.ok && kk.ok) {
      // Hydrolox upper should reduce GLOW meaningfully — ballpark 20 %+ per spec.
      expect(both.glow_kg).toBeLessThan(kk.glow_kg * 0.85);
    }
  });

  it('is deterministic across repeated runs', () => {
    const stack = stackOf(['kerolox', 'methalox', 'hydrolox']);
    const a = autoAllocate(stack, 9_400, 5_000);
    const b = autoAllocate(stack, 9_400, 5_000);
    expect(a).toEqual(b);
  });

  it('5-stage solve is fast (< 50 ms as PLAN M1.3)', () => {
    const stack = stackOf(['kerolox', 'kerolox', 'methalox', 'hydrolox', 'hydrolox']);
    const t0 = performance.now();
    const r = autoAllocate(stack, 9_400, 1_000);
    const dt = performance.now() - t0;
    expect(r.ok).toBe(true);
    expect(dt).toBeLessThan(50);
  });
});
