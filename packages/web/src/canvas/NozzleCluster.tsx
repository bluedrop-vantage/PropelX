// Engine-bell cluster rendered below Stage 1. The number of nozzles and the
// flame colour are chosen from the Stage-1 propellant so the visual is a
// quick cue for the archetype (Merlin cluster vs SSME cluster vs solid
// motor). Booster nozzles flank the core when strap-ons are attached.

import type { ModuleId } from '@propelx/engine';
import { useDesignStore } from '../state/designStore.js';

// Rough engine counts modeled after real vehicles for the archetype.
const NOZZLE_COUNT: Record<ModuleId, number> = {
  solid: 1,      // single grain motor
  kerolox: 5,    // Merlin/F-1 cluster style
  methalox: 7,   // Raptor cluster style
  hydrolox: 3,   // SSME/RS-68 cluster
  hypergolic: 4, // Long March / Vulcain-esque
  coldgas: 1,
  ion: 1,
};

// Flame colours pick up the propellant chemistry visible in real launches.
const FLAME_COLOR: Record<ModuleId, string> = {
  solid: '#F97316',      // bright orange-red particulate flame
  kerolox: '#FBBF24',    // yellow-orange sooty flame
  methalox: '#38BDF8',   // cool blue methane burn
  hydrolox: '#60A5FA',   // near-invisible pale blue
  hypergolic: '#F87171', // reddish NTO/UDMH plume
  coldgas: '#E5E7EB',    // no flame, cool exhaust
  ion: '#A78BFA',        // xenon-ion violet glow
};

interface NozzleProps {
  cx: number;
  bellRadius: number;
  flameColor: string | null;
  flameHeight: number;
}

function Nozzle({ cx, bellRadius, flameColor, flameHeight }: NozzleProps) {
  // Bell profile: narrow throat, flared skirt. All coordinates relative to cx.
  const throatY = 0;
  const bellBottomY = 18;
  const throatW = bellRadius * 0.4;
  return (
    <g transform={`translate(${cx}, 0)`}>
      {flameColor ? (
        <>
          {/* Outer flame — softer, wider */}
          <ellipse
            cx={0}
            cy={bellBottomY + flameHeight * 0.4}
            rx={bellRadius * 0.9}
            ry={flameHeight * 0.55}
            fill={flameColor}
            opacity={0.35}
          />
          {/* Inner flame core — tighter, brighter */}
          <ellipse
            cx={0}
            cy={bellBottomY + flameHeight * 0.3}
            rx={bellRadius * 0.55}
            ry={flameHeight * 0.4}
            fill={flameColor}
            opacity={0.75}
          />
        </>
      ) : null}
      {/* Bell nozzle: throat → skirt, with a subtle vertical gradient */}
      <path
        d={`M ${-throatW} ${throatY}
            Q ${-bellRadius * 1.1} ${bellBottomY * 0.55}, ${-bellRadius} ${bellBottomY}
            L ${bellRadius} ${bellBottomY}
            Q ${bellRadius * 1.1} ${bellBottomY * 0.55}, ${throatW} ${throatY}
            Z`}
        fill="url(#bell-grad)"
        stroke="#1F2937"
        strokeWidth="0.5"
      />
      {/* Interior shadow line for depth */}
      <line x1={-throatW} y1={throatY} x2={throatW} y2={throatY} stroke="#0F172A" strokeWidth="0.8" />
    </g>
  );
}

export function NozzleCluster() {
  const stack = useDesignStore((s) => s.design.stack);
  const solveResult = useDesignStore((s) => s.solveResult);
  const s1 = stack[0];
  if (!s1) return null;

  const nCore = NOZZLE_COUNT[s1.module_id];
  const nBoost = s1.boosters?.count ?? 0;
  const boosterMod = s1.boosters?.module_id;

  const isValid = solveResult.valid;
  const feasible = solveResult.feasible_for_payload;
  const coreFlame = isValid ? FLAME_COLOR[s1.module_id] : null;
  const boostFlame = isValid && boosterMod ? FLAME_COLOR[boosterMod] : null;

  const totalWidth = 220;
  const bellR = 6.5;
  const gap = 3;
  const flameH = feasible ? 26 : isValid ? 14 : 0;
  const svgHeight = 20 + flameH + 6;

  // Layout: [ boosters(left) | core cluster | boosters(right) ]
  // Booster count is total (0/2/4) split evenly on both sides.
  const perSide = nBoost / 2;
  const coreW = nCore * (bellR * 2) + (nCore - 1) * gap;
  const boostW = perSide * (bellR * 2) + Math.max(0, perSide - 1) * gap;
  const totalUsed = coreW + (perSide > 0 ? boostW * 2 + gap * 4 : 0);
  const leftStart = (totalWidth - totalUsed) / 2;

  // Booster positions on the left half.
  const boosterPositions: number[] = [];
  for (let i = 0; i < perSide; i++) {
    boosterPositions.push(leftStart + bellR + i * (bellR * 2 + gap));
  }
  // Core positions after boosters.
  const coreStart = leftStart + (perSide > 0 ? boostW + gap * 4 : 0);
  const corePositions: number[] = [];
  for (let i = 0; i < nCore; i++) {
    corePositions.push(coreStart + bellR + i * (bellR * 2 + gap));
  }
  // Booster positions on the right half.
  const rightStart = coreStart + coreW + (perSide > 0 ? gap * 4 : 0);
  const boosterRightPositions: number[] = [];
  for (let i = 0; i < perSide; i++) {
    boosterRightPositions.push(rightStart + bellR + i * (bellR * 2 + gap));
  }

  return (
    <div className="nozzle-cluster" aria-hidden="true">
      <svg
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        width={totalWidth}
        height={svgHeight}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="bell-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="60%" stopColor="#1F2937" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>
        {boosterPositions.map((cx, i) => (
          <Nozzle key={`bl-${i}`} cx={cx} bellRadius={bellR} flameColor={boostFlame} flameHeight={flameH} />
        ))}
        {corePositions.map((cx, i) => (
          <Nozzle key={`c-${i}`} cx={cx} bellRadius={bellR} flameColor={coreFlame} flameHeight={flameH} />
        ))}
        {boosterRightPositions.map((cx, i) => (
          <Nozzle key={`br-${i}`} cx={cx} bellRadius={bellR} flameColor={boostFlame} flameHeight={flameH} />
        ))}
      </svg>
    </div>
  );
}
