import { useDesignStore } from '../state/designStore.js';
import { useChallengesStore } from '../state/challengesStore.js';
import { useEconomicsStore } from '../state/economicsStore.js';
import { CHALLENGES } from './catalog.js';
import { evaluateChallenge } from './detector.js';
import type { Challenge } from './types.js';
import { DESTINATION_DELTA_V_M_S, type DestinationId } from '@propelx/engine';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

function StartButton({ challenge }: { challenge: Challenge }) {
  const activeId = useChallengesStore((s) => s.activeChallengeId);
  const setActive = useChallengesStore((s) => s.setActiveChallenge);
  const setDestination = useDesignStore((s) => s.setDestination);
  const setPayload = useDesignStore((s) => s.setPayload);
  const setCrewed = useDesignStore((s) => s.setCrewed);
  const setMissionType = useDesignStore((s) => s.setMissionType);

  const isActive = activeId === challenge.id;
  return (
    <button
      type="button"
      className={`start-btn${isActive ? ' active' : ''}`}
      onClick={() => {
        if (isActive) {
          setActive(null);
        } else {
          setActive(challenge);
          setMissionType(challenge.mission.type);
          const dest = challenge.mission.destination as DestinationId;
          setDestination(dest, DESTINATION_DELTA_V_M_S[dest as Exclude<DestinationId, 'CUSTOM'>]);
          setPayload(challenge.mission.payload_kg);
          setCrewed(challenge.mission.crewed);
        }
      }}
      aria-pressed={isActive}
    >
      {isActive ? 'End challenge' : 'Start'}
    </button>
  );
}

export function ChallengesPanel() {
  const design = useDesignStore((s) => s.design);
  const solveResult = useDesignStore((s) => s.solveResult);
  const cost = useEconomicsStore((s) => s.cost);
  const suggestions = useEconomicsStore((s) => s.suggestions);
  const activeId = useChallengesStore((s) => s.activeChallengeId);

  return (
    <section className="challenges-panel" aria-label="Challenges" tabIndex={0}>
      <h3>
        Challenges <HelpTip {...HELP.challenges} />
      </h3>
      <p className="hint">
        Set a mission with concrete objectives. Iterate on your design until every criterion turns
        green.
      </p>
      <ul role="list" className="challenge-list">
        {CHALLENGES.map((c) => {
          const status =
            c.id === activeId ? evaluateChallenge(c, design, solveResult, cost, suggestions) : null;
          return (
            <li key={c.id} className={`challenge-card${status?.allMet ? ' cleared' : ''}`}>
              <header>
                <strong>{c.name}</strong>
                <StartButton challenge={c} />
              </header>
              <p className="challenge-desc">{c.description}</p>
              {status ? (
                <>
                  <ul className="criteria" role="list">
                    {status.results.map((r, i) => (
                      <li key={i} className={r.met ? 'met' : 'unmet'}>
                        <span className="marker" aria-hidden="true">
                          {r.met ? '✓' : '·'}
                        </span>
                        <span className="target">{r.target}</span>
                        <span className="actual">{r.actual}</span>
                      </li>
                    ))}
                    {c.bannedModules ? (
                      <li className={status.bannedModuleUsed ? 'unmet' : 'met'}>
                        <span className="marker" aria-hidden="true">
                          {status.bannedModuleUsed ? '·' : '✓'}
                        </span>
                        <span className="target">no {c.bannedModules.join(' / ')}</span>
                        <span className="actual">
                          {status.bannedModuleUsed ?? 'clean'}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                  {status.allMet ? (
                    <div className="cleared-banner" role="status">
                      Challenge cleared — well done.
                    </div>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
