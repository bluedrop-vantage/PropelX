import { useEconomicsStore } from '../state/economicsStore.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

function usd(x: number): string {
  if (!Number.isFinite(x) || x <= 0) return '—';
  if (x >= 1_000_000) return `$${(x / 1_000_000).toFixed(2)}M`;
  if (x >= 1_000) return `$${(x / 1_000).toFixed(1)}k`;
  return `$${Math.round(x).toLocaleString()}`;
}

export function CostBreakdown() {
  const cost = useEconomicsStore((s) => s.cost);
  return (
    <section className="cost-breakdown" aria-label="Cost breakdown">
      <h3>
        Estimated cost <HelpTip {...HELP.economics} />
      </h3>
      <dl className="cost-grid">
        <div>
          <dt>Propellant</dt>
          <dd>{usd(cost.propellantUsd)}</dd>
        </div>
        <div>
          <dt>Hardware</dt>
          <dd>{usd(cost.hardwareUsd)}</dd>
        </div>
        <div>
          <dt>Cost / flight</dt>
          <dd>{usd(cost.costPerFlightUsd)}</dd>
        </div>
        <div>
          <dt>Cost / kg to orbit</dt>
          <dd>{usd(cost.costPerKgOrbitUsd)}</dd>
        </div>
        <div>
          <dt>Ops complexity</dt>
          <dd>{cost.opsComplexity.toFixed(1)} / 10</dd>
        </div>
        <div>
          <dt>Toxicity</dt>
          <dd>{cost.toxicityScore} / 5</dd>
        </div>
      </dl>
      <p className="disclaimer">
        Illustrative 2020s-era figures. Edit assumptions below to explore sensitivity.
      </p>
    </section>
  );
}
