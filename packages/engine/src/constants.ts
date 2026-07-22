// PropelX engine constants.
// Spec references: §4.1 (destination Δv), §6 (g₀), §6.5 (propellant densities).

import type { DestinationId } from './types.js';

export const G0 = 9.80665;

// Isp selection rule (spec §3.1): Stage 1 uses trajectory-averaged
// 0.85 × sea-level + 0.15 × vacuum; upper stages use vacuum.
export const STAGE1_ISP_SL_WEIGHT = 0.85;
export const STAGE1_ISP_VAC_WEIGHT = 0.15;

// Spec §4.1 + PLAN §6 Q3 in-space presets.
// Launch destinations (surface → orbit; loss budgets included) and in-space
// transfer presets (starting from a stable orbit; no gravity/drag budget).
export const DESTINATION_DELTA_V_M_S: Record<Exclude<DestinationId, 'CUSTOM'>, number> = {
  // launch (spec §4.1)
  LEO: 9_400,
  SSO: 9_700,
  GTO: 11_900,
  TLI: 12_600,
  // in-space transfers (idealised patched-conic figures)
  LEO_TO_GTO: 2_500,
  LEO_TO_TLI: 3_200,
  GTO_TO_GEO: 1_500,
  LEO_TO_MARS: 4_300,
};

// Which destinations belong to which mission type. Both types accept CUSTOM.
export const LAUNCH_DESTINATIONS: DestinationId[] = ['LEO', 'SSO', 'GTO', 'TLI', 'CUSTOM'];
export const IN_SPACE_DESTINATIONS: DestinationId[] = [
  'LEO_TO_GTO',
  'LEO_TO_TLI',
  'GTO_TO_GEO',
  'LEO_TO_MARS',
  'CUSTOM',
];

// Custom Δv bounds (spec §4.1).
export const CUSTOM_DELTA_V_MIN_M_S = 1_000;
export const CUSTOM_DELTA_V_MAX_M_S = 15_000;

// Payload bounds (spec §4.2).
export const PAYLOAD_MIN_KG = 1;
export const PAYLOAD_MAX_KG = 200_000;

// TWR thresholds (spec §6.4).
export const LIFTOFF_TWR_MIN = 1.2;
export const UPPER_STAGE_TWR_WARN = 0.7;
export const UPPER_STAGE_TWR_FAIL = 0.4;

// Stage count bounds (spec §5.2).
export const STAGE_COUNT_MIN = 1;
export const STAGE_COUNT_MAX = 5;

// Tech-level ε override bounds (PLAN §6 Q2).
//   0.02 ≈ carbon-fibre balloon tank (aggressive)
//   0.30 ≈ heavy-gauge steel, uninsulated
export const STRUCTURAL_FRACTION_MIN = 0.02;
export const STRUCTURAL_FRACTION_MAX = 0.30;

// Per-stage Isp override bounds (s). Covers cold-gas at the low end (~60 s)
// through experimental ion at the high end (~8 000 s).
export const ISP_OVERRIDE_MIN_S = 60;
export const ISP_OVERRIDE_MAX_S = 8_000;

// Per-stage mixture-ratio override bounds (oxidiser : fuel by mass).
// Real chemistry spans ~1.9 (hypergolic) to ~6.0 (hydrolox); wider bounds
// let engineers explore off-nominal ratios without breaking sizing.
export const MIXTURE_RATIO_OVERRIDE_MIN = 0.5;
export const MIXTURE_RATIO_OVERRIDE_MAX = 10;

// Per-stage max-TWR override bounds. Archetype defaults span ~1e-4 (ion) to
// 2.5 (solid). The band below covers hypothetical engine clusters up to
// the structural limit of the vehicle.
export const MAX_TWR_OVERRIDE_MIN = 0.001;
export const MAX_TWR_OVERRIDE_MAX = 5;

// ---- Launch-assist constants (Electro-Magnetic Launch Assist doc) -----

// Sea-level ISA air density.
export const AIR_DENSITY_SEA_LEVEL_KG_M3 = 1.225;
// Atmospheric scale height (m). ρ(h) ≈ ρ₀·exp(-h/H). Anchored to ISA up to
// ~30 km within 5 %.
export const ATMOSPHERE_SCALE_HEIGHT_M = 8_500;

// Δv "loss savings" the assist gifts the rocket at altitude.
//   savings(h) = LOSS_BUDGET_M_S · (1 − exp(-h / LOSS_SCALE_HEIGHT_M))
// Anchored so 5 km ≈ 550 m/s savings and 20 km ≈ 1.2 km/s, matching
// public studies on air-launched systems (Pegasus, LauncherOne class).
export const ASSIST_LOSS_BUDGET_M_S = 1_600;
export const ASSIST_LOSS_SCALE_HEIGHT_M = 12_000;

// User-facing bounds for the launch-assist UI.
export const ASSIST_EXIT_VELOCITY_MIN_M_S = 50;
export const ASSIST_EXIT_VELOCITY_MAX_M_S = 3_000;    // Mach ~9 in vacuum
export const ASSIST_EXIT_VELOCITY_AGGRESSIVE_M_S = 2_000;
export const ASSIST_TRACK_ANGLE_MIN_DEG = 0;
export const ASSIST_TRACK_ANGLE_MAX_DEG = 45;
export const ASSIST_BASE_ELEVATION_MAX_KM = 25;

// Human-tolerance accel limits (short duration).
export const ASSIST_ACCEL_MAX_CREWED_G = 4;
export const ASSIST_ACCEL_MAX_UNCREWED_G = 15;
