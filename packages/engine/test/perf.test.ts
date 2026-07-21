// Engine performance gates. Spec §6.6:
//   "Full solve (auto-allocation, 5 stages) < 100 ms on a mid-range laptop."
//
// This file is executed as part of `pnpm test` so CI catches perf regressions.
// For ongoing benchmark tracking (hz / mean / rme), see test/perf.bench.ts.

import { describe, it, expect } from 'vitest';
import { loadCatalog, solve } from '../src/index.js';
import type { DesignDoc } from '../src/types.js';

const catalog = loadCatalog();

function fiveStageStack(): DesignDoc {
  return {
    schema_version: '1.0',
    mission: { destination: 'TLI', delta_v_m_s: 12_600, payload_kg: 5_000, crewed: false },
    stack: [
      { position: 1, module_id: 'kerolox' },
      { position: 2, module_id: 'kerolox' },
      { position: 3, module_id: 'methalox' },
      { position: 4, module_id: 'hydrolox' },
      { position: 5, module_id: 'hydrolox' },
    ],
    allocation_mode: 'auto',
    manual_allocation_m_s: null,
  };
}

function timedSolves(design: DesignDoc, N: number): number[] {
  const times: number[] = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    const t0 = performance.now();
    solve(design, catalog);
    times[i] = performance.now() - t0;
  }
  return times.sort((a, b) => a - b);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx]!;
}

describe('§6.6 performance gates', () => {
  it('5-stage solve p99 < 100 ms across 200 runs (spec §6.6)', () => {
    const times = timedSolves(fiveStageStack(), 200);
    const p99 = percentile(times, 0.99);
    expect(p99).toBeLessThan(100);
  });

  it('5-stage solve p50 < 20 ms across 200 runs (regression canary)', () => {
    const times = timedSolves(fiveStageStack(), 200);
    const p50 = percentile(times, 0.5);
    expect(p50).toBeLessThan(20);
  });

  it('2-stage solve p99 < 20 ms across 200 runs (typical interactive load)', () => {
    const design: DesignDoc = {
      schema_version: '1.0',
      mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 3_500, crewed: false },
      stack: [
        { position: 1, module_id: 'kerolox' },
        { position: 2, module_id: 'hydrolox' },
      ],
      allocation_mode: 'auto',
      manual_allocation_m_s: null,
    };
    const times = timedSolves(design, 200);
    const p99 = percentile(times, 0.99);
    expect(p99).toBeLessThan(20);
  });
});
