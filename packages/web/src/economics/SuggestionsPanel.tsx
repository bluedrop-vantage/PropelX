import { useEconomicsStore, applySuggestion } from '../state/economicsStore.js';
import { useDesignStore } from '../state/designStore.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

function sign(n: number): string {
  return n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`;
}

export function SuggestionsPanel() {
  const suggestions = useEconomicsStore((s) => s.suggestions);
  const catalog = useDesignStore((s) => s.catalog);
  if (suggestions.length === 0) {
    return (
      <section className="suggestions-panel" aria-label="Suggestions">
        <h3>
        Suggestions <HelpTip {...HELP.suggestions} />
      </h3>
        <p className="empty">No suggestions for this design. Nice work.</p>
      </section>
    );
  }
  return (
    <section className="suggestions-panel" aria-label="Suggestions">
      <h3>
        Suggestions <HelpTip {...HELP.suggestions} />
      </h3>
      <ul role="list">
        {suggestions.map((s) => (
          <li key={s.ruleId} className="suggestion-card">
            <header>
              <strong>{s.ruleId}</strong>
              <span>{s.title}</span>
            </header>
            <p>{s.body}</p>
            {s.impact ? (
              <div className="impact-row" aria-label="Estimated impact">
                <span title="Gross Liftoff Mass change">GLOW {sign(s.impact.glowChangePct)}</span>
                <span title="Cost per kg to orbit change">$/kg {sign(s.impact.costPerKgChangePct)}</span>
              </div>
            ) : null}
            {s.counterfactual ? (
              <button
                type="button"
                className="apply"
                onClick={() => {
                  const cf = s.counterfactual;
                  if (cf) applySuggestion(cf, catalog as never);
                }}
              >
                Apply
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
