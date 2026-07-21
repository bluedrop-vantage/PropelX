import { useDesignStore } from '../state/designStore.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

/**
 * Booster count picker attached to Stage 1 (§3.2). Only 0/2/4 per spec.
 */
export function BoosterControl() {
  const stack = useDesignStore((s) => s.design.stack);
  const setCount = useDesignStore((s) => s.setStage1BoosterCount);
  const s1 = stack[0];
  if (!s1) return null;
  const current = (s1.boosters?.count ?? 0) as 0 | 2 | 4;
  return (
    <div className="booster-control" role="group" aria-label="Strap-on boosters">
      <span className="booster-label">Boosters</span>
      {[0, 2, 4].map((count) => (
        <button
          key={count}
          type="button"
          className={current === count ? 'active' : ''}
          onClick={() => setCount(count as 0 | 2 | 4)}
          aria-pressed={current === count}
        >
          {count}
        </button>
      ))}
      <HelpTip {...HELP.boosters} />
    </div>
  );
}
