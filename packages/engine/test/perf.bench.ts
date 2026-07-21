// Vitest benchmark for engine perf tracking. Run with:
//   pnpm --filter @propelx/engine bench
//
// This complements test/perf.test.ts (which enforces spec §6.6 gates as
// pass/fail assertions). Benchmarks here run under tinybench and produce
// hz/mean/rme figures useful for spotting slow drifts over time.

import { bench, describe } from 'vitest';
import { loadCatalog, solve, autoAllocate, maxPayload } from '../src/index.js';
import type { DesignDoc } from '../src/types.js';

const catalog = loadCatalog();

const twoStage: DesignDoc = {
  schema_version: '1.0',
  mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 3_500, crewed: false },
  stack: [
    { position: 1, module_id: 'kerolox' },
    { position: 2, module_id: 'hydrolox' },
  ],
  allocation_mode: 'auto',
  manual_allocation_m_s: null,
};

const fiveStage: DesignDoc = {
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

const twoStageWithBoosters: DesignDoc = {
  ...twoStage,
  stack: [
    { position: 1, module_id: 'kerolox', boosters: { module_id: 'solid', count: 4 } },
    { position: 2, module_id: 'hydrolox' },
  ],
};

describe('solve()', () => {
  bench('2-stage kerolox/hydrolox → LEO', () => {
    solve(twoStage, catalog);
  });

  bench('5-stage kerolox×2 / methalox / hydrolox×2 → TLI', () => {
    solve(fiveStage, catalog);
  });

  bench('2-stage with 4 strap-on boosters', () => {
    solve(twoStageWithBoosters, catalog);
  });
});

describe('autoAllocate()', () => {
  const stackModules = twoStage.stack.map((s, i) => ({
    module: catalog.byId(s.module_id),
    ispMode: i === 0 ? ('stage1' as const) : ('upper' as const),
  }));
  bench('2-stage Nelder–Mead over 1 free variable', () => {
    autoAllocate(stackModules, 9_400, 3_500);
  });

  const fiveStackModules = fiveStage.stack.map((s, i) => ({
    module: catalog.byId(s.module_id),
    ispMode: i === 0 ? ('stage1' as const) : ('upper' as const),
  }));
  bench('5-stage Nelder–Mead over 4 free variables', () => {
    autoAllocate(fiveStackModules, 12_600, 5_000);
  });
});

describe('maxPayload() bisection', () => {
  const stackModules = twoStage.stack.map((s, i) => ({
    module: catalog.byId(s.module_id),
    ispMode: i === 0 ? ('stage1' as const) : ('upper' as const),
  }));
  bench('2-stage bisection over payload bounds', () => {
    maxPayload(stackModules, 9_400);
  });
});
