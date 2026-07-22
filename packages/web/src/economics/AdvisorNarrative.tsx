import { useEffect, useState } from 'react';
import { useDesignStore } from '../state/designStore.js';
import { useEconomicsStore } from '../state/economicsStore.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

const PROXY_URL = import.meta.env.VITE_ADVISOR_PROXY_URL ?? 'http://localhost:4001/advise';

interface AdvisorResponse {
  narrative: string;
  cached: boolean;
  safety: { passed: boolean; suspiciousNumbers: string[] };
  model: string;
}

export function AdvisorNarrative() {
  const design = useDesignStore((s) => s.design);
  const solveResult = useDesignStore((s) => s.solveResult);
  const resetToken = useDesignStore((s) => s.resetToken);
  const cost = useEconomicsStore((s) => s.cost);
  const suggestions = useEconomicsStore((s) => s.suggestions);
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'loading' } | { kind: 'ok'; data: AdvisorResponse } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  // Clear any displayed narrative on a design reset. Component-local state
  // wouldn't otherwise be reachable by the store's resetDesign action.
  useEffect(() => {
    setState({ kind: 'idle' });
  }, [resetToken]);

  const request = async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design, solve: solveResult, cost, suggestions }),
      });
      if (!res.ok) {
        const text = await res.text();
        setState({ kind: 'error', message: `Proxy ${res.status}: ${text.slice(0, 200)}` });
        return;
      }
      const data = (await res.json()) as AdvisorResponse;
      setState({ kind: 'ok', data });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState({ kind: 'error', message });
    }
  };

  return (
    <section className="advisor" aria-label="Aerospace consultant narrative">
      <h3>
        Consultant narrative <HelpTip {...HELP.advisor} />
      </h3>
      <p className="hint">
        Free-form assessment from an LLM. All numbers come from the engine — the LLM narrates only.
      </p>
      <button type="button" onClick={request} disabled={state.kind === 'loading' || !solveResult.valid}>
        {state.kind === 'loading' ? 'Thinking…' : 'Explain this design'}
      </button>
      {state.kind === 'ok' ? (
        <div className={`advisor-body${state.data.safety.passed ? '' : ' unsafe'}`}>
          <div className="advisor-meta">
            <span>{state.data.model}</span>
            {state.data.cached ? <span className="badge">cached</span> : null}
            <span className="badge">narrative only — figures from engine</span>
          </div>
          <pre>{state.data.narrative}</pre>
          {!state.data.safety.passed ? (
            <p className="warning-inline">
              Numeric safety check flagged {state.data.safety.suspiciousNumbers.length} value
              {state.data.safety.suspiciousNumbers.length === 1 ? '' : 's'} that didn’t match the
              engine payload. Treat this narrative with extra caution.
            </p>
          ) : null}
        </div>
      ) : null}
      {state.kind === 'error' ? (
        <p className="error">Advisor unavailable: {state.message}</p>
      ) : null}
    </section>
  );
}
