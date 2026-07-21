// Number formatting helpers. All engine numbers are metric; conversion to
// imperial happens here at display time. Reading the units store inside these
// helpers means callers don't have to thread a unit flag through every prop.

import { useUnitsStore } from '../state/unitsStore.js';

// Physical conversions. Sources: NIST SP 811.
const KG_TO_LB = 2.2046226218;
const KG_TO_SHORT_TON = 1 / 907.18474;
const M_TO_FT = 3.280839895;
const M3_TO_FT3 = 35.31466672;

function unitSystem(): 'metric' | 'imperial' {
  return useUnitsStore.getState().system;
}

export function formatMass(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '—';
  if (unitSystem() === 'imperial') {
    const lb = kg * KG_TO_LB;
    if (lb >= 2000) return `${(kg * KG_TO_SHORT_TON).toFixed(1)} short ton`;
    return `${Math.round(lb).toLocaleString()} lb`;
  }
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)} t`;
  return `${Math.round(kg)} kg`;
}

export function formatVolume(m3: number): string {
  if (!Number.isFinite(m3) || m3 <= 0) return '—';
  if (unitSystem() === 'imperial') {
    const ft3 = m3 * M3_TO_FT3;
    if (ft3 >= 1000) return `${Math.round(ft3).toLocaleString()} ft³`;
    return `${ft3.toFixed(1)} ft³`;
  }
  if (m3 >= 100) return `${Math.round(m3)} m³`;
  return `${m3.toFixed(1)} m³`;
}

export function formatDeltaV(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  if (unitSystem() === 'imperial') {
    return `${Math.round(ms * M_TO_FT).toLocaleString()} ft/s`;
  }
  return `${Math.round(ms).toLocaleString()} m/s`;
}

export function formatPercent(frac: number, digits = 2): string {
  if (!Number.isFinite(frac)) return '—';
  return `${(frac * 100).toFixed(digits)}%`;
}

export function formatIsp(s: number): string {
  // Isp is dimensionless in seconds — same value in both systems.
  return `${Math.round(s)} s`;
}

export function formatRatio(r: number): string {
  return `${r.toFixed(2)}×`;
}
