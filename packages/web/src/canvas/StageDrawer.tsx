// Stage detail drawer with manual Δv allocation sliders (spec §6.3).
// Opens when a stage sprite is clicked. Sliders are sum-constrained so
// changing one auto-rebalances the others proportionally. Also shows the
// auto-optimal GLOW next to the manual GLOW so the user sees the cost of
// their choice.

import { useEffect, useMemo, useState } from 'react';
import {
  autoAllocate,
  ISP_OVERRIDE_MAX_S,
  ISP_OVERRIDE_MIN_S,
  MAX_TWR_OVERRIDE_MAX,
  MAX_TWR_OVERRIDE_MIN,
  MIXTURE_RATIO_OVERRIDE_MAX,
  MIXTURE_RATIO_OVERRIDE_MIN,
  STRUCTURAL_FRACTION_MAX,
  STRUCTURAL_FRACTION_MIN,
  type StackModule,
} from '@propelx/engine';
import { useDesignStore } from '../state/designStore.js';
import { formatDeltaV, formatMass, formatPercent } from '../lib/format.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

export function StageDrawer() {
  const drawerIndex = useDesignStore((s) => s.drawerStageIndex);
  const close = useDesignStore((s) => s.closeStageDrawer);
  const design = useDesignStore((s) => s.design);
  const catalog = useDesignStore((s) => s.catalog);
  const solveResult = useDesignStore((s) => s.solveResult);
  const setAllocationMode = useDesignStore((s) => s.setAllocationMode);
  const setManualAllocation = useDesignStore((s) => s.setManualAllocation);
  const setStructuralFraction = useDesignStore((s) => s.setStageStructuralFraction);
  const setIsp = useDesignStore((s) => s.setStageIsp);
  const setMixtureRatio = useDesignStore((s) => s.setStageMixtureRatio);
  const setMaxTwr = useDesignStore((s) => s.setStageMaxTwr);

  const stage = drawerIndex !== null ? design.stack[drawerIndex] : null;
  const stageModule = stage ? catalog.byId(stage.module_id) : null;
  const stageResult = drawerIndex !== null ? solveResult.stages[drawerIndex] : undefined;

  // Local sliders — kept in sync with store's manual_allocation_m_s but with
  // proportional re-balancing when a single slider is moved.
  const totalDv = design.mission.delta_v_m_s;
  const isManual = design.allocation_mode === 'manual';
  const N = design.stack.length;

  const initialAlloc = useMemo(() => {
    if (design.manual_allocation_m_s && design.manual_allocation_m_s.length === N) {
      return design.manual_allocation_m_s.slice();
    }
    // Seed from the current auto solve.
    if (solveResult.valid) {
      return solveResult.stages.map((s) => s.delta_v_m_s);
    }
    // Fallback: equal split.
    return new Array<number>(N).fill(totalDv / N);
  }, [design.manual_allocation_m_s, solveResult, N, totalDv]);

  const [sliders, setSliders] = useState<number[]>(initialAlloc);
  useEffect(() => {
    setSliders(initialAlloc);
  }, [initialAlloc]);

  // Compare auto-optimal GLOW at this moment.
  const autoGlow = useMemo(() => {
    if (!isManual) return solveResult.glow_kg;
    const stackModules: StackModule[] = design.stack.map((s, i) => ({
      module: catalog.byId(s.module_id),
      ispMode: i === 0 ? ('stage1' as const) : ('upper' as const),
    }));
    const a = autoAllocate(stackModules, totalDv, design.mission.payload_kg);
    return a.ok ? a.glow_kg : 0;
  }, [isManual, solveResult.glow_kg, design, catalog, totalDv]);

  if (drawerIndex === null || !stage || !stageModule) return null;

  const rebalance = (movedIndex: number, newValue: number) => {
    // Sum-constrained: the moved slider takes `newValue`; the rest share the
    // remaining budget in proportion to their previous values.
    const clamped = Math.max(0, Math.min(totalDv, newValue));
    const remaining = totalDv - clamped;
    const otherIndices = sliders.map((_, i) => i).filter((i) => i !== movedIndex);
    const otherSum = otherIndices.reduce((a, i) => a + sliders[i]!, 0);
    const next = sliders.slice();
    next[movedIndex] = clamped;
    if (otherSum <= 0) {
      const share = remaining / otherIndices.length;
      for (const i of otherIndices) next[i] = share;
    } else {
      for (const i of otherIndices) next[i] = (sliders[i]! / otherSum) * remaining;
    }
    setSliders(next);
    if (design.allocation_mode !== 'manual') setAllocationMode('manual');
    setManualAllocation(next);
  };

  const glowDelta = autoGlow > 0 ? (solveResult.glow_kg - autoGlow) / autoGlow : 0;

  return (
    <div className="drawer-backdrop" onClick={close} role="presentation">
      <aside
        className="stage-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h3 id="stage-drawer-title">
            Stage {stage.position} · {stageModule.name}{' '}
            <HelpTip {...HELP.stageDrawer} />
          </h3>
          <button type="button" onClick={close} aria-label="Close drawer">
            ✕
          </button>
        </header>

        {stageResult ? (
          <dl className="drawer-key-figures">
            <div>
              <dt>Δv</dt>
              <dd>{formatDeltaV(stageResult.delta_v_m_s)}</dd>
            </div>
            <div>
              <dt>Propellant</dt>
              <dd>{formatMass(stageResult.propellant_kg)}</dd>
            </div>
            <div>
              <dt>Dry mass</dt>
              <dd>{formatMass(stageResult.dry_kg)}</dd>
            </div>
            <div>
              <dt>Mass ratio</dt>
              <dd>{stageResult.mass_ratio.toFixed(2)}×</dd>
            </div>
          </dl>
        ) : null}

        <TechLevelSlider
          index={drawerIndex}
          archetypeEps={stageModule.structural_fraction}
          currentOverride={stage.structural_fraction_override}
          setStructuralFraction={setStructuralFraction}
        />

        <IspSlider
          index={drawerIndex}
          archetypeIspVac_s={stageModule.isp_vac_s}
          archetypeIspSl_s={stageModule.isp_sl_s}
          currentOverride={stage.isp_override_s}
          setIsp={setIsp}
        />

        {stageModule.mixture_ratio_ox_to_fuel !== null ? (
          <MixtureRatioSlider
            index={drawerIndex}
            archetypeRatio={stageModule.mixture_ratio_ox_to_fuel}
            currentOverride={stage.mixture_ratio_override}
            setMixtureRatio={setMixtureRatio}
          />
        ) : null}

        <MaxTwrSlider
          index={drawerIndex}
          archetypeMaxTwr={stageModule.max_twr_at_liftoff}
          currentOverride={stage.max_twr_override}
          setMaxTwr={setMaxTwr}
        />

        <section className="allocation-mode" aria-label="Allocation mode">
          <label className="mode-toggle">
            <input
              type="radio"
              name="alloc-mode"
              checked={!isManual}
              onChange={() => {
                setAllocationMode('auto');
                setManualAllocation(null);
              }}
            />
            Auto (optimizer minimises GLOW)
          </label>
          <label className="mode-toggle">
            <input
              type="radio"
              name="alloc-mode"
              checked={isManual}
              onChange={() => {
                setAllocationMode('manual');
                setManualAllocation(sliders);
              }}
            />
            Manual (per-stage Δv sliders)
          </label>
        </section>

        <section className="manual-sliders" aria-label="Per-stage Δv sliders">
          {sliders.map((dv, i) => (
            <div key={i} className="slider-row">
              <label htmlFor={`dv-${i}`}>
                Stage {i + 1} · {catalog.byId(design.stack[i]!.module_id).name}
              </label>
              <input
                id={`dv-${i}`}
                type="range"
                min={0}
                max={totalDv}
                step={50}
                value={Math.round(dv)}
                onChange={(e) => rebalance(i, Number(e.target.value))}
                disabled={!isManual}
              />
              <output>{formatDeltaV(dv)}</output>
            </div>
          ))}
          <div className="sum-check" aria-live="polite">
            <span>Total {formatDeltaV(sliders.reduce((a, b) => a + b, 0))}</span>
            <span className="required">Required {formatDeltaV(totalDv)}</span>
          </div>
        </section>

        {isManual && solveResult.valid ? (
          <section className="glow-compare" aria-label="Manual vs auto GLOW">
            <div>
              <dt>Manual GLOW</dt>
              <dd>{formatMass(solveResult.glow_kg)}</dd>
            </div>
            <div>
              <dt>Auto-optimal GLOW</dt>
              <dd>{formatMass(autoGlow)}</dd>
            </div>
            <div className={glowDelta > 0.005 ? 'warn' : ''}>
              <dt>Cost of your split</dt>
              <dd>{glowDelta === 0 ? '—' : formatPercent(glowDelta, 1)}</dd>
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

/**
 * Per-stage structural-fraction override (PLAN §6 Q2 "technology level"
 * slider). Lower ε = lighter tanks = better payload fraction. Real-world
 * anchors:
 *   ε ≈ 0.04–0.06   carbon-composite balloon tank (Atlas Centaur)
 *   ε ≈ 0.06–0.10   aluminium-lithium isogrid (Falcon 9 upper)
 *   ε ≈ 0.10–0.15   steel monocoque (Delta II)
 *   ε ≈ 0.20+       first-generation V-2-era construction
 */
function TechLevelSlider({
  index,
  archetypeEps,
  currentOverride,
  setStructuralFraction,
}: {
  index: number;
  archetypeEps: number;
  currentOverride: number | undefined;
  setStructuralFraction: (i: number, eps: number | undefined) => void;
}) {
  const value = currentOverride ?? archetypeEps;
  const isOverridden = currentOverride !== undefined;
  return (
    <section className="tech-level-slider" aria-label="Structural fraction (tech level)">
      <label htmlFor={`tech-${index}`}>
        Tech level (ε = {value.toFixed(3)})
        {isOverridden ? (
          <button
            type="button"
            className="reset"
            onClick={() => setStructuralFraction(index, undefined)}
          >
            reset to {archetypeEps.toFixed(3)}
          </button>
        ) : null}
      </label>
      <input
        id={`tech-${index}`}
        type="range"
        min={STRUCTURAL_FRACTION_MIN}
        max={STRUCTURAL_FRACTION_MAX}
        step={0.005}
        value={value}
        onChange={(e) => setStructuralFraction(index, Number(e.target.value))}
      />
      <div className="tech-scale">
        <span>Balloon tank</span>
        <span>Steel</span>
      </div>
    </section>
  );
}

/**
 * Per-stage Isp override slider. Engineers can dial in an experimental Isp
 * rating (e.g. "what if hydrolox gave us 470 s?") without editing the shared
 * catalog. Falls back to the archetype's stage-1 blend or vacuum value.
 *
 * Real-world anchors:
 *   Isp (s)     Engine class
 *      60–100   Cold gas thrusters
 *     240–290   Solid motors
 *     300–360   Kerolox liquids
 *     330–380   Methalox liquids (Raptor, BE-4)
 *     380–465   Hydrolox liquids (RL10, SSME)
 *     285–330   Hypergolics (NTO/UDMH)
 *   2500–4500   Ion / Hall-effect thrusters
 */
function IspSlider({
  index,
  archetypeIspVac_s,
  archetypeIspSl_s,
  currentOverride,
  setIsp,
}: {
  index: number;
  archetypeIspVac_s: number;
  archetypeIspSl_s: number | null;
  currentOverride: number | undefined;
  setIsp: (i: number, isp_s: number | undefined) => void;
}) {
  const archetypeDefault = archetypeIspVac_s;
  const value = currentOverride ?? archetypeDefault;
  const isOverridden = currentOverride !== undefined;
  return (
    <section className="tech-level-slider" aria-label="Specific impulse (Isp)">
      <label htmlFor={`isp-${index}`}>
        Isp (Isp = {value.toFixed(0)} s{archetypeIspSl_s !== null ? ' vac' : ''})
        {isOverridden ? (
          <button
            type="button"
            className="reset"
            onClick={() => setIsp(index, undefined)}
          >
            reset to {archetypeDefault.toFixed(0)} s
          </button>
        ) : null}
      </label>
      <input
        id={`isp-${index}`}
        type="range"
        min={ISP_OVERRIDE_MIN_S}
        max={ISP_OVERRIDE_MAX_S}
        step={10}
        value={value}
        onChange={(e) => setIsp(index, Number(e.target.value))}
      />
      <div className="tech-scale">
        <span>Cold gas</span>
        <span>Ion</span>
      </div>
    </section>
  );
}

/**
 * Per-stage propellant mixture-ratio override. Real-world anchors:
 *   RP-1 / LOX ~ 2.3       Methane / LOX ~ 3.6
 *   H₂ / LOX ~ 6.0         NTO / UDMH ~ 2.1
 * Only affects the fuel/ox split and tank-volume readout — total propellant
 * mass is unchanged.
 */
function MixtureRatioSlider({
  index,
  archetypeRatio,
  currentOverride,
  setMixtureRatio,
}: {
  index: number;
  archetypeRatio: number;
  currentOverride: number | undefined;
  setMixtureRatio: (i: number, ratio: number | undefined) => void;
}) {
  const value = currentOverride ?? archetypeRatio;
  const isOverridden = currentOverride !== undefined;
  return (
    <section className="tech-level-slider" aria-label="Mixture ratio (oxidiser : fuel)">
      <label htmlFor={`mr-${index}`}>
        Mixture ratio (ox : fuel = {value.toFixed(2)})
        {isOverridden ? (
          <button
            type="button"
            className="reset"
            onClick={() => setMixtureRatio(index, undefined)}
          >
            reset to {archetypeRatio.toFixed(2)}
          </button>
        ) : null}
      </label>
      <input
        id={`mr-${index}`}
        type="range"
        min={MIXTURE_RATIO_OVERRIDE_MIN}
        max={MIXTURE_RATIO_OVERRIDE_MAX}
        step={0.1}
        value={value}
        onChange={(e) => setMixtureRatio(index, Number(e.target.value))}
      />
      <div className="tech-scale">
        <span>Fuel-rich</span>
        <span>Ox-rich</span>
      </div>
    </section>
  );
}

/**
 * Per-stage max TWR override. Represents the engine cluster's ceiling given
 * plausible hardware. Real-world anchors: solid ≈ 2.5, kerolox / methalox ≈
 * 1.8, hypergolic ≈ 1.5, hydrolox ≈ 1.3, ion ≈ 1e-4.
 *
 * Feeds V-4 (liftoff TWR ≥ 1.2) and V-6 (upper-stage TWR bands).
 */
function MaxTwrSlider({
  index,
  archetypeMaxTwr,
  currentOverride,
  setMaxTwr,
}: {
  index: number;
  archetypeMaxTwr: number;
  currentOverride: number | undefined;
  setMaxTwr: (i: number, twr: number | undefined) => void;
}) {
  const value = currentOverride ?? archetypeMaxTwr;
  const isOverridden = currentOverride !== undefined;
  return (
    <section className="tech-level-slider" aria-label="Max ignition TWR (engine cluster ceiling)">
      <label htmlFor={`twr-${index}`}>
        Max TWR (T/W = {value.toFixed(3)})
        {isOverridden ? (
          <button
            type="button"
            className="reset"
            onClick={() => setMaxTwr(index, undefined)}
          >
            reset to {archetypeMaxTwr.toFixed(3)}
          </button>
        ) : null}
      </label>
      <input
        id={`twr-${index}`}
        type="range"
        min={MAX_TWR_OVERRIDE_MIN}
        max={MAX_TWR_OVERRIDE_MAX}
        step={0.01}
        value={value}
        onChange={(e) => setMaxTwr(index, Number(e.target.value))}
      />
      <div className="tech-scale">
        <span>Ion (milli-g)</span>
        <span>Heavy cluster</span>
      </div>
    </section>
  );
}
