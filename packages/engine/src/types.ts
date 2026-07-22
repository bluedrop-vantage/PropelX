// PropelX physics engine — core types.
// Spec references: §8.1 (catalog), §8.2 (design), §8.3 (solve result), §6.4 (validation).

// Launch-mode destinations (surface → orbit) plus in-space transfer presets
// (start already in orbit). Custom accepts any Δv budget in either mode.
export type DestinationId =
  // launch (surface → orbit)
  | 'LEO'
  | 'SSO'
  | 'GTO'
  | 'TLI'
  // in-space transfers
  | 'LEO_TO_GTO'
  | 'LEO_TO_TLI'
  | 'GTO_TO_GEO'
  | 'LEO_TO_MARS'
  // shared
  | 'CUSTOM';

export type MissionType = 'launch' | 'in-space';

export interface Mission {
  destination: DestinationId;
  delta_v_m_s: number;
  payload_kg: number;
  crewed: boolean;
  // Schema headroom per PLAN §6 open-question #3.
  type?: MissionType;
}

export type ModuleId =
  | 'solid'
  | 'kerolox'
  | 'methalox'
  | 'hydrolox'
  | 'hypergolic'
  | 'coldgas'
  | 'ion';

export interface CatalogEconomics {
  propellant_cost_usd_per_kg: { fuel: number; oxidizer: number };
  hardware_cost_usd_per_kg_dry: number;
  ops_complexity: number;
  toxicity: number;
  reuse_suitability: number;
}

export interface CatalogModule {
  id: ModuleId;
  name: string;
  isp_sl_s: number | null;
  isp_vac_s: number;
  structural_fraction: number;
  mixture_ratio_ox_to_fuel: number | null;
  densities_kg_m3: { fuel: number | null; oxidizer: number | null };
  max_twr_at_liftoff: number;
  lift_capable: boolean;
  restartable: boolean;
  throttleable: boolean;
  tags: string[];
  notes: string;
  economics: CatalogEconomics;
}

export interface Catalog {
  catalog_version: string;
  modules: ReadonlyArray<CatalogModule>;
  byId(id: ModuleId): CatalogModule;
}

export interface BoostersConfig {
  module_id: ModuleId;
  count: 0 | 2 | 4;
}

export interface StackEntry {
  position: number;
  module_id: ModuleId;
  boosters?: BoostersConfig;
  // Per-stage override of the archetype's structural fraction ε
  // (PLAN §6 Q2 "technology level slider"). Undefined = use archetype default.
  // Bounds enforced by the UI: [0.02, 0.30].
  structural_fraction_override?: number;
  // Per-stage override of the archetype's specific impulse (s). Applies to
  // whichever mode the stage runs in (stage-1 blend or vacuum). Undefined
  // means the engine falls back to the archetype's Isp values.
  // Bounds enforced by the UI: [60, 8000] s (cold gas ≈ 60, ion ≈ 8000).
  isp_override_s?: number;
  // Per-stage override of the propellant mixture ratio (oxidiser : fuel by
  // mass). Only affects the fuel/oxidiser split and tank-volume display —
  // total propellant mass is unchanged. Ignored on solid / cold-gas / ion
  // stages (no oxidiser). Bounds enforced by the UI: [0.5, 10].
  mixture_ratio_override?: number;
  // Per-stage override of the archetype's max liftoff/ignition TWR. Models
  // "what engine cluster can we mount on this stage". Feeds V-4/V-6 and
  // the stage's twr_ignition readout. Bounds: [0.001, 5].
  max_twr_override?: number;
}

export type AllocationMode = 'auto' | 'manual';

/**
 * Electro-magnetic launch assist configuration (add-on module).
 * See docs/launch-assist.md for the physics derivation.
 *
 * The assist provides two gifts to the rocket:
 *   1. An exit velocity `exit_velocity_m_s` — subtracted directly from the
 *      mission Δv budget (v_exit magnitude, direction handled by pitch program).
 *   2. Base elevation — reduces the atmospheric-loss portion of the mission
 *      Δv budget through `altitude_loss_savings`.
 */
export type LaunchAssistSystem = 'linear_motor' | 'railgun' | 'coilgun';

export interface LaunchAssistConfig {
  enabled: boolean;
  system_type: LaunchAssistSystem;
  exit_velocity_m_s: number;         // v_exit at end of track
  track_angle_deg: number;           // θ (0 = horizontal)
  base_elevation_km: number;         // h at bottom of track
  peak_acceleration_g: number;       // a_max along the track
  vehicle_cross_section_m2: number;  // A for drag (≈ π·r² of interstage)
  drag_coefficient: number;          // Cd (≈ 0.3 for typical hammerhead)
  partial_vacuum: boolean;           // if true, F_drag ≈ 0 inside the tube
  drive_efficiency: number;          // η, e.g. 0.85 (electrical → mechanical)
}

export interface DesignDoc {
  schema_version: string;
  mission: Mission;
  stack: StackEntry[];
  allocation_mode: AllocationMode;
  manual_allocation_m_s: number[] | null;
  launch_assist?: LaunchAssistConfig;
}

// Validation rule identifiers per spec §6.4 + V-9 (launch-assist limits).
export type RuleId = 'V-1' | 'V-2' | 'V-3' | 'V-4' | 'V-5' | 'V-6' | 'V-7' | 'V-8' | 'V-9';

export interface Violation {
  rule: RuleId;
  stage?: number;
  message: string;
}

export interface Warning {
  rule: RuleId;
  stage?: number;
  message: string;
}

export interface StageResult {
  position: number;
  delta_v_m_s: number;
  isp_used_s: number;
  mass_ratio: number;
  propellant_kg: number;
  fuel_kg: number;
  oxidizer_kg: number;
  dry_kg: number;
  tank_volume_m3: number;
  twr_ignition: number;
}

export interface LaunchAssistResult {
  enabled: boolean;
  // Δv contribution back to the rocket. Effective rocket Δv = mission Δv − delta_v_reduction.
  delta_v_reduction_m_s: number;
  exit_velocity_savings_m_s: number;   // = config.exit_velocity_m_s
  altitude_loss_savings_m_s: number;   // from ρ(h) reduction of the loss budget
  // Track sizing given peak acceleration.
  track_length_m: number;
  duration_s: number;
  // Loads on the vehicle at end of track.
  peak_thrust_N: number;
  peak_power_W: number;
  air_density_kg_m3: number;
  drag_force_at_exit_N: number;
  // Energy delivered.
  total_energy_J: number;
  vehicle_mass_kg: number;
}

export interface BoosterResult {
  module_id: ModuleId;
  count: 2 | 4;
  delta_v_m_s: number; // Δv contributed by the parallel phase
  propellant_kg_each: number;
  propellant_kg_total: number;
  dry_kg_each: number;
  dry_kg_total: number;
  effective_parallel_isp_s: number; // mass-flow-weighted (booster + core parallel share)
  composite_liftoff_max_twr: number; // max of booster and core archetype ceilings
}

export interface SolveResult {
  valid: boolean;
  violations: Violation[];
  warnings: Warning[];
  feasible_for_payload: boolean;
  max_payload_kg: number | null;
  glow_kg: number;
  payload_fraction: number;
  stages: StageResult[];
  booster?: BoosterResult;
  launch_assist?: LaunchAssistResult;
  // Effective rocket Δv target after the launch assist gift (equal to
  // mission Δv when no assist is present). Surfaced so the UI can show
  // "3,400 m/s covered by rocket, 500 m/s covered by assist".
  effective_rocket_delta_v_m_s?: number;
}
