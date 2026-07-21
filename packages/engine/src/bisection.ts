// Max-payload bisection. Spec §6.5.
// Find the largest payload for which the given stack + Δv budget still closes.

import { PAYLOAD_MAX_KG, PAYLOAD_MIN_KG } from './constants.js';
import { autoAllocate, type StackModule } from './allocator.js';

export interface MaxPayloadOptions {
  tolerance_rel?: number;
  maxIter?: number;
}

/**
 * Returns:
 *   - a number for the largest closing payload
 *   - PAYLOAD_MAX_KG (with `capped=true`) if it still closes at the max bound
 *   - null if it doesn't close even at PAYLOAD_MIN_KG
 */
export interface MaxPayloadResult {
  payload_kg: number | null;
  capped: boolean;
}

export function maxPayload(
  stack: StackModule[],
  deltaVTotal_m_s: number,
  opts: MaxPayloadOptions = {},
): MaxPayloadResult {
  const tol = opts.tolerance_rel ?? 1e-3;
  const maxIter = opts.maxIter ?? 60;

  const closes = (payload: number): boolean => autoAllocate(stack, deltaVTotal_m_s, payload).ok;

  // Fast fail: even the smallest payload doesn't close.
  if (!closes(PAYLOAD_MIN_KG)) {
    return { payload_kg: null, capped: false };
  }
  // Fast top: even the largest payload closes.
  if (closes(PAYLOAD_MAX_KG)) {
    return { payload_kg: PAYLOAD_MAX_KG, capped: true };
  }

  let lo = PAYLOAD_MIN_KG;
  let hi = PAYLOAD_MAX_KG;
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    if (closes(mid)) lo = mid;
    else hi = mid;
    if ((hi - lo) / Math.max(hi, 1) < tol) break;
  }
  return { payload_kg: lo, capped: false };
}
