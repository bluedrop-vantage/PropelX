import type { BoosterResult } from '@propelx/engine';
import { formatMass } from '../lib/format.js';

/**
 * Small badge rendered on either side of Stage 1 to represent an attached
 * strap-on booster (§3.2). Purely visual — the engine treats boosters as a
 * virtual Stage-0, and this badge surfaces the per-booster sizing.
 */
export function BoosterBadge({ booster, side }: { booster: BoosterResult; side: 'left' | 'right' }) {
  return (
    <div className={`booster-badge ${side}`} aria-label={`${booster.count} solid strap-on boosters`}>
      <div className="booster-body">
        <span className="count">{booster.count / 2}×</span>
        <span className="label">solid</span>
        <span className="mp">{formatMass(booster.propellant_kg_each)}</span>
      </div>
    </div>
  );
}
