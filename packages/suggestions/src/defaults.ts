// Default cost assumptions per spec §10.1. All numbers are illustrative
// 2020s figures — the UI must expose these as editable and clearly labeled.

import type { CostAssumptions } from './types.js';

export const DEFAULT_ASSUMPTIONS: CostAssumptions = {
  propellant_usd_per_kg: {
    solid_grain: 5.0,
    kerolox_fuel: 2.0,
    kerolox_ox: 0.2,
    methalox_fuel: 1.0,
    methalox_ox: 0.2,
    hydrolox_fuel: 6.0,
    hydrolox_ox: 0.2,
    hypergolic_fuel: 80.0,
    hypergolic_ox: 80.0,
  },
  hardware_usd_per_kg_dry: {
    solid: 1200,
    kerolox: 2500,
    methalox: 2800,
    hydrolox: 4500,
    hypergolic: 3500,
    coldgas: 1000,
    ion: 8000,
  },
  reuse: {
    enabled: false,
    flightsAmortized: 10,
    stage1PenaltyFraction: 0.30,
  },
};
