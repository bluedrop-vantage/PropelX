import { useDesignStore } from '../state/designStore.js';
import { VerdictBanner } from './VerdictBanner.js';
import { DeltaVWaterfall } from './DeltaVWaterfall.js';
import { MassBreakdown } from './MassBreakdown.js';
import { StageCard } from './StageCard.js';
import { KeyFigures } from './KeyFigures.js';
import { ChallengeBanner } from '../challenges/ChallengeBanner.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

export function ResultsPanel() {
  const result = useDesignStore((s) => s.solveResult);
  const design = useDesignStore((s) => s.design);
  return (
    <section className="results-panel" aria-label="Results" tabIndex={0}>
      <h2>
        Results <HelpTip {...HELP.results} />
      </h2>
      <ChallengeBanner />
      <VerdictBanner />
      {result.valid ? (
        <>
          <KeyFigures />
          <DeltaVWaterfall />
          <MassBreakdown />
          <div className="stage-cards">
            {result.stages.map((s, i) => (
              <StageCard key={i} stage={s} design={design} index={i} />
            ))}
          </div>
        </>
      ) : (
        <ul className="violation-list" role="list">
          {result.violations.map((v, i) => (
            <li key={i} className="violation">
              <strong>{v.rule}</strong>
              {v.stage ? <span className="stage-tag">stage {v.stage}</span> : null}
              <p>{v.message}</p>
            </li>
          ))}
        </ul>
      )}
      {result.warnings.length > 0 ? (
        <ul className="warning-list" role="list">
          {result.warnings.map((w, i) => (
            <li key={i} className="warning">
              <strong>{w.rule}</strong>
              {w.stage ? <span className="stage-tag">stage {w.stage}</span> : null}
              <p>{w.message}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
