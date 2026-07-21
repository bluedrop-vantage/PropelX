// Cost model per spec §10.1.
//
//   Propellant $ = Σ per stage (fuel_kg × $/kg + ox_kg × $/kg)
//   Hardware $  = Σ dry_kg × archetype $/kg-dry
//   Vehicle $   = propellant + hardware   (expendable single-flight view)
//   Ops        = product of per-archetype ops_complexity, mapped to 1..10
//   Cost/flight = with reuse toggle: hardware / N + propellant, else vehicle$
//   Cost/kg    = cost_per_flight / payload_kg
//
// Reuse penalty modeled as a payload-fraction hit: PLAN M9 applies the
// −30% Stage-1 performance as a Δv tax elsewhere. Here we just do the
// straight cost accounting given a solve result already computed.

import type { Catalog, DesignDoc, ModuleId, SolveResult } from '@propelx/engine';
import type { CostAssumptions, CostBreakdown } from './types.js';

function propellantUsdForStage(
  moduleId: ModuleId,
  fuel_kg: number,
  oxidizer_kg: number,
  a: CostAssumptions,
): number {
  const p = a.propellant_usd_per_kg;
  switch (moduleId) {
    case 'solid':
      return fuel_kg * p.solid_grain;
    case 'kerolox':
      return fuel_kg * p.kerolox_fuel + oxidizer_kg * p.kerolox_ox;
    case 'methalox':
      return fuel_kg * p.methalox_fuel + oxidizer_kg * p.methalox_ox;
    case 'hydrolox':
      return fuel_kg * p.hydrolox_fuel + oxidizer_kg * p.hydrolox_ox;
    case 'hypergolic':
      return fuel_kg * p.hypergolic_fuel + oxidizer_kg * p.hypergolic_ox;
    case 'coldgas':
      return 0; // trivial
    case 'ion':
      return fuel_kg * 50; // illustrative xenon-class
  }
}

function hardwareUsdPerKgDry(moduleId: ModuleId, a: CostAssumptions): number {
  return a.hardware_usd_per_kg_dry[moduleId];
}

/** Simple ops-complexity aggregation: geometric mean of per-stage archetype ops,
 * mapped to a 1..10 scale. Hydrolox (5) and hypergolic (5) score high. */
export function estimateCost(
  design: DesignDoc,
  solve: SolveResult,
  assumptions: CostAssumptions,
  catalog: Catalog,
): CostBreakdown {
  const moduleOps = (id: ModuleId) => catalog.byId(id).economics.ops_complexity;
  const moduleTox = (id: ModuleId) => catalog.byId(id).economics.toxicity;
  const moduleReuse = (id: ModuleId) => catalog.byId(id).economics.reuse_suitability;
  if (!solve.valid || solve.stages.length === 0) {
    return {
      propellantUsd: 0,
      hardwareUsd: 0,
      vehicleUsd: 0,
      costPerFlightUsd: 0,
      costPerKgOrbitUsd: 0,
      opsComplexity: 1,
      toxicityScore: 0,
      reuseSuitability: 1,
      perStage: [],
    };
  }

  let propellantUsd = 0;
  let hardwareUsd = 0;
  let stage1HardwareUsd = 0;
  const perStage: CostBreakdown['perStage'] = [];

  for (let i = 0; i < solve.stages.length; i++) {
    const stage = solve.stages[i]!;
    const entry = design.stack[i]!;
    const modId = entry.module_id;
    const stageProp = propellantUsdForStage(modId, stage.fuel_kg, stage.oxidizer_kg, assumptions);
    const stageHard = stage.dry_kg * hardwareUsdPerKgDry(modId, assumptions);
    propellantUsd += stageProp;
    hardwareUsd += stageHard;
    if (i === 0) stage1HardwareUsd = stageHard;
    perStage.push({
      position: stage.position,
      propellantUsd: stageProp,
      hardwareUsd: stageHard,
      opsComplexity: moduleOps(modId),
    });
  }

  const vehicleUsd = propellantUsd + hardwareUsd;

  // Reuse amortization: Stage-1 hardware is spread across N flights.
  let costPerFlightUsd = vehicleUsd;
  if (assumptions.reuse.enabled && assumptions.reuse.flightsAmortized > 0) {
    const stage1Amortized = stage1HardwareUsd / assumptions.reuse.flightsAmortized;
    const upperStagesHardware = hardwareUsd - stage1HardwareUsd;
    costPerFlightUsd = propellantUsd + upperStagesHardware + stage1Amortized;
  }

  const payload = design.mission.payload_kg;
  const costPerKgOrbitUsd = payload > 0 ? costPerFlightUsd / payload : 0;

  // Ops complexity: geometric mean of per-stage ops (1..5), then linearly
  // scaled to 1..10 across the plausible min/max of 1..5.
  const opsGeoMean = Math.pow(
    perStage.reduce((a, s) => a * Math.max(1, s.opsComplexity), 1),
    1 / perStage.length,
  );
  const opsComplexity = 1 + ((opsGeoMean - 1) / 4) * 9; // 1..5 → 1..10

  const toxicityScore = Math.max(
    0,
    ...design.stack.map((e) => moduleTox(e.module_id)),
  );
  const reuseSuitability =
    design.stack.reduce((a, e) => a + moduleReuse(e.module_id), 0) / design.stack.length;

  return {
    propellantUsd,
    hardwareUsd,
    vehicleUsd,
    costPerFlightUsd,
    costPerKgOrbitUsd,
    opsComplexity: Math.round(opsComplexity * 10) / 10,
    toxicityScore,
    reuseSuitability: Math.round(reuseSuitability * 10) / 10,
    perStage,
  };
}
