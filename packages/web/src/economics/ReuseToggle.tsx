import { useEconomicsStore } from '../state/economicsStore.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

export function ReuseToggle() {
  const reuse = useEconomicsStore((s) => s.assumptions.reuse);
  const setReuse = useEconomicsStore((s) => s.setReuse);
  return (
    <section className="reuse-toggle" aria-label="Reuse toggle">
      <h3>
        Reuse <HelpTip {...HELP.reuse} />
      </h3>
      <label className="switch">
        <input
          type="checkbox"
          checked={reuse.enabled}
          onChange={(e) => setReuse({ enabled: e.target.checked })}
        />
        <span>Reuse Stage 1</span>
      </label>
      {reuse.enabled ? (
        <div className="reuse-inputs">
          <label>
            Flights amortized
            <input
              type="number"
              min={1}
              max={200}
              value={reuse.flightsAmortized}
              onChange={(e) => setReuse({ flightsAmortized: Number(e.target.value) })}
            />
          </label>
          <p className="hint">
            Reuse costs ~30 % of Stage 1 performance as landing propellant + hardware.
            Cost per flight = propellant + upper hardware + Stage-1 hardware / flights.
          </p>
        </div>
      ) : null}
    </section>
  );
}
