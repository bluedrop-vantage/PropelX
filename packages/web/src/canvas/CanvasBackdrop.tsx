// Environmental backdrop behind the assembly canvas. Reacts to mission type:
//
//   launch    → blue sky gradient with a green grass strip at the bottom
//   in-space  → deep-space gradient with a deterministic star field
//
// Rendered as the first child of .stack-column with absolute positioning so
// it sits behind the fairing/stages/nozzles/pad without affecting layout.
// Deterministic star positions (seeded LCG) keep the field stable across
// re-renders — no jitter when the stack updates.

import { useMemo } from 'react';
import { useDesignStore } from '../state/designStore.js';

// Simple linear-congruential PRNG so star positions are stable across
// renders + browsers (spec §9.8 determinism spirit).
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

function generateStars(seed: number, count: number): Star[] {
  const rnd = seededRandom(seed);
  const out: Star[] = new Array<Star>(count);
  for (let i = 0; i < count; i++) {
    out[i] = {
      x: rnd() * 100,       // percent of viewBox width
      y: rnd() * 100,       // percent of viewBox height
      r: 0.15 + rnd() * 0.7,
      opacity: 0.35 + rnd() * 0.65,
    };
  }
  return out;
}

function SpaceBackdrop() {
  // 90 stars is dense enough to feel like a starfield but sparse enough that
  // the vehicle stack reads clearly against it.
  const stars = useMemo(() => generateStars(0x5EED_C7A5, 90), []);
  return (
    <svg
      className="canvas-backdrop space"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="space-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000814" />
          <stop offset="60%" stopColor="#050B20" />
          <stop offset="100%" stopColor="#0B1130" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#space-grad)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#F8FAFC" opacity={s.opacity} />
      ))}
      {/* A couple of larger accent stars for depth. */}
      <circle cx="72" cy="18" r="1.1" fill="#FDE68A" opacity="0.9" />
      <circle cx="24" cy="63" r="1.0" fill="#BFDBFE" opacity="0.85" />
    </svg>
  );
}

function LaunchBackdrop() {
  return (
    <svg
      className="canvas-backdrop launch"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="35%" stopColor="#3B82F6" />
          <stop offset="85%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id="grass-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4E8F3A" />
          <stop offset="100%" stopColor="#3F6B2E" />
        </linearGradient>
      </defs>
      {/* Sky: top 88% of the viewport */}
      <rect x="0" y="0" width="100" height="88" fill="url(#sky-grad)" />
      {/* Soft cloud shapes */}
      <ellipse cx="18" cy="18" rx="12" ry="3" fill="#FFFFFF" opacity="0.35" />
      <ellipse cx="72" cy="12" rx="16" ry="3" fill="#FFFFFF" opacity="0.28" />
      <ellipse cx="45" cy="30" rx="10" ry="2.4" fill="#FFFFFF" opacity="0.22" />
      <ellipse cx="86" cy="42" rx="9" ry="2" fill="#FFFFFF" opacity="0.20" />
      {/* Grass strip: bottom 12% */}
      <rect x="0" y="88" width="100" height="12" fill="url(#grass-grad)" />
      {/* A few grass tufts */}
      <path d="M 5 88 l 1 -3 l 1 3 z M 22 88 l 1 -3 l 1 3 z M 55 88 l 1 -3 l 1 3 z M 88 88 l 1 -3 l 1 3 z"
            fill="#3F6B2E" opacity="0.7" />
    </svg>
  );
}

export function CanvasBackdrop() {
  const missionType = useDesignStore((s) => s.design.mission.type ?? 'launch');
  return missionType === 'in-space' ? <SpaceBackdrop /> : <LaunchBackdrop />;
}
