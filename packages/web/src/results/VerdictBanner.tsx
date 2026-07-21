import { useDesignStore } from '../state/designStore.js';
import { branding } from '../branding/Wordmark.js';
import { formatMass } from '../lib/format.js';

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

  return (
    <div
      className="verdict-banner green"
      role="status"
      aria-live="polite"
      style={{ background: branding.accentDark }}
    >
      <strong>REACHES ORBIT</strong>
      <span>GLOW {formatMass(result.glow_kg)} · payload fraction {(result.payload_fraction * 100).toFixed(2)}%</span>
    </div>
  );
}
