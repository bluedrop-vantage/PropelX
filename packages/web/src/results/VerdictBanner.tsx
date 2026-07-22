import type { DestinationId } from '@propelx/engine';
import { useDesignStore } from '../state/designStore.js';
import { branding } from '../branding/Wordmark.js';
import { formatMass } from '../lib/format.js';

// Success verdict text per destination. In-space transfers reach a target
// orbit; a launch mission reaches its target from the pad. Custom missions
// simply "close" — we don't know what the Δv budget represents.
const VERDICT_SUCCESS: Record<DestinationId, string> = {
  LEO: 'REACHES ORBIT',
  SSO: 'REACHES SUN-SYNCHRONOUS ORBIT',
  GTO: 'REACHES GTO',
  TLI: 'REACHES TLI',
  LEO_TO_GTO: 'TRANSFER TO GTO CLOSES',
  LEO_TO_TLI: 'TRANS-LUNAR INJECTION CLOSES',
  GTO_TO_GEO: 'CIRCULARISATION AT GEO CLOSES',
  LEO_TO_MARS: 'TRANS-MARS INJECTION CLOSES',
  CUSTOM: 'MISSION Δv BUDGET MET',
};

export function VerdictBanner() {
  const result = useDesignStore((s) => s.solveResult);
  const design = useDesignStore((s) => s.design);
  const emptyStack = design.stack.length === 0;

  if (emptyStack) {
    return (
      <div className="verdict-banner neutral" role="status">
        Add a stage to begin.
      </div>
    );
  }

  if (!result.valid) {
    return (
      <div className="verdict-banner red" role="status" aria-live="polite">
        <strong>DESIGN FAILS</strong>
        <span>{result.violations[0]?.message ?? 'Multiple issues — see the list.'}</span>
      </div>
    );
  }

  if (!result.feasible_for_payload) {
    const cap = result.max_payload_kg;
    return (
      <div className="verdict-banner amber" role="status" aria-live="polite">
        <strong>CLOSES ONLY AT {cap !== null ? formatMass(cap) : 'a smaller payload'}</strong>
        <span>Reduce payload or improve staging.</span>
      </div>
    );
  }

  const successLabel = VERDICT_SUCCESS[design.mission.destination] ?? 'MISSION Δv BUDGET MET';

  return (
    <div
      className="verdict-banner green"
      role="status"
      aria-live="polite"
      style={{ background: branding.accentDark }}
    >
      <strong>{successLabel}</strong>
      <span>
        GLOW {formatMass(result.glow_kg)} · payload fraction{' '}
        {(result.payload_fraction * 100).toFixed(2)}%
      </span>
    </div>
  );
}
