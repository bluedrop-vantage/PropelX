import { useState } from 'react';
import { useEconomicsStore } from '../state/economicsStore.js';
import type { CostAssumptions } from '@propelx/suggestions';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

type PropellantKey = keyof CostAssumptions['propellant_usd_per_kg'];
type HardwareKey = keyof CostAssumptions['hardware_usd_per_kg_dry'];

export function AssumptionsDrawer() {
  const assumptions = useEconomicsStore((s) => s.assumptions);
  const setAssumptions = useEconomicsStore((s) => s.setAssumptions);
  const reset = useEconomicsStore((s) => s.resetAssumptions);
  const [open, setOpen] = useState(false);

  return (
    <section className="assumptions-drawer" aria-label="Assumptions">
      <div className="assumptions-header">
        <button type="button" className="drawer-toggle" onClick={() => setOpen((v) => !v)}>
          {open ? '▼' : '▶'} Assumptions ({open ? 'hide' : 'show'})
        </button>
        <HelpTip {...HELP.assumptions} />
      </div>
      {open ? (
        <div className="drawer-body">
          <p className="disclaimer">
            All figures illustrative (roughly 2020s-era). Editing recomputes cost and
            re-ranks suggestions live.
          </p>
          <h4>Propellant $/kg</h4>
          <div className="grid">
            {(Object.keys(assumptions.propellant_usd_per_kg) as PropellantKey[]).map((k) => (
              <label key={k}>
                {k}
                <input
                  type="number"
                  step="0.1"
                  value={assumptions.propellant_usd_per_kg[k]}
                  onChange={(e) =>
                    setAssumptions({
                      propellant_usd_per_kg: {
                        ...assumptions.propellant_usd_per_kg,
                        [k]: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <h4>Hardware $/kg dry</h4>
          <div className="grid">
            {(Object.keys(assumptions.hardware_usd_per_kg_dry) as HardwareKey[]).map((k) => (
              <label key={k}>
                {k}
                <input
                  type="number"
                  step="100"
                  value={assumptions.hardware_usd_per_kg_dry[k]}
                  onChange={(e) =>
                    setAssumptions({
                      hardware_usd_per_kg_dry: {
                        ...assumptions.hardware_usd_per_kg_dry,
                        [k]: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={reset} className="reset">
            Reset to defaults
          </button>
        </div>
      ) : null}
    </section>
  );
}
