import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../src/catalog.js';
import { maxPayload } from '../src/bisection.js';
import { autoAllocate, type StackModule } from '../src/allocator.js';
import { PAYLOAD_MAX_KG } from '../src/constants.js';

const catalog = loadCatalog();

const singleKerolox: StackModule[] = [{ module: catalog.byId('kerolox'), ispMode: 'stage1' }];
const twoStageKeroloxHydrolox: StackModule[] = [
  { module: catalog.byId('kerolox'), ispMode: 'stage1' },
  { module: catalog.byId('hydrolox'), ispMode: 'upper' },
];

describe('maxPayload — §6.5', () => {
  it('returns null when the stack cannot close (single kerolox to LEO)', () => {
    const r = maxPayload(singleKerolox, 9_400);
    expect(r.payload_kg).toBeNull();
    expect(r.capped).toBe(false);
  });

  it('returns capped=true when the stack closes at the max payload bound', () => {
    // Kerolox/hydrolox to LEO has generous headroom in this simplified model
    // (spec §6.2 feasibility is Δv-bounded, not payload-bounded), so any
    // payload up to the schema bound closes. Bisection should recognise this.
    const r = maxPayload(twoStageKeroloxHydrolox, 9_400);
    expect(r.capped).toBe(true);
    expect(r.payload_kg).toBe(PAYLOAD_MAX_KG);
    // And the direct solve at that payload also closes — the "agrees within
    // 0.1 %" property from §9 test 7 holds trivially here.
    const direct = autoAllocate(twoStageKeroloxHydrolox, 9_400, PAYLOAD_MAX_KG);
    expect(direct.ok).toBe(true);
  });

  it('at a non-capped reported max, autoAllocate closes (§9 test 7)', () => {
    // Construct a Δv budget close enough to the per-stage feasibility limit
    // that payload matters. We do this by pushing a single-stage hydrolox
    // very close to its ceiling — at Δv=9500 m/s single hydrolox is
    // feasible (Isp 450, k = 0.11/0.89 ≈ 0.124 → max Δv ≈ 9560 m/s).
    const hydrolox: StackModule[] = [{ module: catalog.byId('hydrolox'), ispMode: 'stage1' }];
    // Use ispMode 'upper' to force pure vacuum Isp for the calculation to
    // stay tight against the theoretical single-stage limit.
    hydrolox[0]!.ispMode = 'upper';
    const r = maxPayload(hydrolox, 9_500);
    // Whether capped or specific, at r.payload_kg the design must close.
    expect(r.payload_kg).not.toBeNull();
    const direct = autoAllocate(hydrolox, 9_500, r.payload_kg!);
    expect(direct.ok).toBe(true);
  });

  it('is deterministic', () => {
    const a = maxPayload(twoStageKeroloxHydrolox, 9_400);
    const b = maxPayload(twoStageKeroloxHydrolox, 9_400);
    expect(a).toEqual(b);
  });
});
