// Centralised help copy. Prose is kept short and task-focused: what this
// section is for, and how to use it. Physics detail belongs in the About
// modal and the spec — help tips answer "what do I do here?".

import type { ReactNode } from 'react';

export interface HelpEntry {
  title: string;
  body: ReactNode;
}

// Typed with `satisfies` so each key retains its concrete `HelpEntry` shape.
// A `Record<string, HelpEntry>` would collapse under noUncheckedIndexedAccess
// to `HelpEntry | undefined`, which then breaks `<HelpTip {...HELP.foo} />`.
export const HELP = {
  // ---- Left column ----------------------------------------------------
  pantry: {
    title: 'Pantry',
    body: (
      <>
        <p>
          Every card is a propulsion archetype. Drag one onto the stack to add it as a stage,
          or press the <strong>Insert</strong> button to place it at the top.
        </p>
        <p>
          Bottom of the stack = Stage 1 (does the lifting). Higher stages use vacuum Isp, so
          they benefit most from lightweight, high-Isp propellants like hydrolox.
        </p>
      </>
    ),
  },

  // ---- Assembly canvas ------------------------------------------------
  canvas: {
    title: 'Vehicle stack',
    body: (
      <>
        <p>
          Stages stack bottom-up; Stage 1 sits on the pad. Drop zones appear between existing
          stages when you drag. Sprite height grows with propellant mass on a log scale — a
          hydrogen upper stage looks noticeably bigger than a kerolox one for the same Δv.
        </p>
        <p>
          Click the <strong>⋯</strong> button on a stage to open its detail drawer (Δv sliders,
          tech-level). Use arrow keys while a stage is focused to reorder; Delete removes.
        </p>
      </>
    ),
  },
  boosters: {
    title: 'Strap-on boosters',
    body: (
      <>
        <p>
          Solid boosters bolt onto Stage&nbsp;1 and burn in parallel. The sandbox models them
          as a virtual Stage&nbsp;0 using solid-motor properties (high thrust, low Isp).
        </p>
        <p>
          Boosters clear the &ldquo;thrust-poor&rdquo; warning that a hydrolox first stage
          otherwise triggers, at the cost of extra dry mass and one more separation event.
        </p>
      </>
    ),
  },

  // ---- Mission --------------------------------------------------------
  mission: {
    title: 'Mission',
    body: (
      <>
        <p>
          Pick a destination and a payload. Δv budgets for launch destinations already include
          gravity + drag losses (~1.6&nbsp;km/s for LEO).
        </p>
        <p>
          Toggle <strong>In-space</strong> for missions that start in orbit — ion, cold gas,
          and hydrolox become legitimate first-stage choices there.
        </p>
      </>
    ),
  },
  missionType: {
    title: 'Launch vs In-space',
    body: (
      <>
        <p>
          <strong>Launch</strong>: lifts a payload from the pad; V-3 (lift-capable), V-4
          (liftoff TWR), V-6 (upper-stage TWR), and V-8 (cold gas) all apply.
        </p>
        <p>
          <strong>In-space</strong>: design begins already in a stable orbit. Gravity-fighting
          rules relax, all stages use vacuum Isp, and low-thrust systems like ion tugs work.
        </p>
      </>
    ),
  },
  payload: {
    title: 'Payload',
    body: (
      <>
        <p>
          Enter a mass in kg, or click a preset. Crewed presets include the pressurised
          capsule, life support, heat shield, parachutes, and abort system — which is why
          &ldquo;2 astronauts&rdquo; is 9.5&nbsp;tonnes, not 160 kg.
        </p>
      </>
    ),
  },
  launchAssist: {
    title: 'Electro-magnetic launch assist',
    body: (
      <>
        <p>
          Optional add-on. An EM launcher (maglev, railgun, or coilgun) gives the vehicle a
          starting velocity and altitude, shrinking the Δv the rocket has to cover.
        </p>
        <p>
          Peak thrust and power grow linearly with vehicle mass and exit velocity; power at
          exit is <em>P = F · v</em>, which can reach gigawatts even for moderate rockets.
          Watch the peak-power readout to see the electrical infrastructure cost.
        </p>
        <p>
          <strong>Human tolerance</strong>: 4g is the sustained-launch cap for crewed
          missions. Uncrewed payloads tolerate up to 15g in this sandbox.
        </p>
      </>
    ),
  },

  // ---- Right column: results ------------------------------------------
  results: {
    title: 'Results',
    body: (
      <>
        <p>
          Live output from the physics engine. Green = closes for the entered payload. Amber =
          closes but only below your payload. Red = the design fails one or more validation
          rules (V-1&hellip;V-9).
        </p>
      </>
    ),
  },
  verdict: {
    title: 'Verdict banner',
    body: (
      <>
        <p>
          One-line summary of whether the design flies. When failing, the message quotes the
          first violation — the full list appears below.
        </p>
      </>
    ),
  },
  keyFigures: {
    title: 'Key figures',
    body: (
      <>
        <p>
          <strong>GLOW</strong>: gross liftoff mass, payload + Σ(dry + propellant) per stage.
          <br />
          <strong>Payload fraction</strong>: payload ÷ GLOW. Falcon-9 class is ~3–4%.
          <br />
          When launch assist is active, an extra row shows how the total Δv is split between
          the rocket and the assist.
        </p>
      </>
    ),
  },
  deltaVWaterfall: {
    title: 'Δv per stage',
    body: (
      <>
        <p>
          How the total Δv budget is allocated across stages. In auto mode the optimizer
          pushes more Δv onto higher-Isp stages (the Saturn-V pattern).
        </p>
      </>
    ),
  },
  massBreakdown: {
    title: 'Mass breakdown',
    body: (
      <>
        <p>
          GLOW split into payload, per-stage propellant, and per-stage dry mass. A design that
          looks &ldquo;too pointy&rdquo; on this bar is dominated by propellant tanks — expect
          large fairings and high wet-mass fractions.
        </p>
      </>
    ),
  },
  stageCard: {
    title: 'Per-stage card',
    body: (
      <>
        <p>
          Everything the physics engine knows about this stage — Δv allocated, Isp used, mass
          ratio, propellant with fuel/ox split, dry mass, estimated tank volume, and TWR at
          ignition. Volumes use the archetype's density (RP-1 810, LOX 1141, LH2 71&nbsp;kg/m³
          &hellip;).
        </p>
      </>
    ),
  },
  stageDrawer: {
    title: 'Stage detail drawer',
    body: (
      <>
        <p>
          <strong>Tech level (ε)</strong>: structural fraction override. Lower ε means
          lighter tanks (balloon-tank ~0.04); higher ε means heavy-gauge steel (~0.20).
        </p>
        <p>
          <strong>Auto vs Manual Δv</strong>: switch to manual to move Δv between stages
          yourself. The Cost-of-your-split row shows what the auto optimizer would have done.
        </p>
      </>
    ),
  },

  // ---- Comparison tray ------------------------------------------------
  comparison: {
    title: 'Comparison tray',
    body: (
      <>
        <p>
          Pin up to 3 snapshots of your current design. Costs are re-computed with the
          current assumptions each time, so pinned designs stay honest as you edit the
          Assumptions Drawer.
        </p>
        <p>
          Click <strong>Load</strong> on a row to swap the pinned design back into the canvas
          — an easy way to A/B compare variants.
        </p>
      </>
    ),
  },

  // ---- Economics tab --------------------------------------------------
  economics: {
    title: 'Economics',
    body: (
      <>
        <p>
          Illustrative 2020s-era cost estimates layered on top of the physics. Numbers are
          editable in the Assumptions Drawer at the bottom of this tab and re-rank the
          suggestions live.
        </p>
      </>
    ),
  },
  reuse: {
    title: 'Reuse toggle',
    body: (
      <>
        <p>
          Toggle to amortize Stage-1 hardware cost over multiple flights. The sandbox applies
          a ~30% Stage-1 performance penalty (landing propellant + hardware) and reports
          expendable and reusable cost/kg side by side.
        </p>
      </>
    ),
  },
  suggestions: {
    title: 'Suggestions engine',
    body: (
      <>
        <p>
          Rules-based suggestions (S-1&hellip;S-7) each run a real counterfactual solve to
          compute their impact numbers — no canned text. Click <strong>Apply</strong> to
          mutate the stack to match the suggestion.
        </p>
      </>
    ),
  },
  advisor: {
    title: 'LLM consultant',
    body: (
      <>
        <p>
          Sends the design + solve + cost + suggestions to the Together.ai proxy for a
          free-form narrative. The LLM narrates only — every number it cites must appear in
          the payload we sent (checked by the proxy).
        </p>
      </>
    ),
  },
  assumptions: {
    title: 'Assumptions drawer',
    body: (
      <>
        <p>
          Illustrative propellant $/kg and hardware $/kg-dry defaults. Bump any value and the
          Economics tab plus the suggestions engine re-rank in place — a good way to see how
          sensitive the design is to input costs.
        </p>
      </>
    ),
  },

  // ---- Challenges -----------------------------------------------------
  challenges: {
    title: 'Challenges',
    body: (
      <>
        <p>
          Pre-authored missions with concrete objectives (cost caps, payload thresholds,
          banned modules). Click <strong>Start</strong> and the mission is locked; iterate on
          the design until every criterion turns green.
        </p>
      </>
    ),
  },

  // ---- Units toggle ---------------------------------------------------
  units: {
    title: 'Units',
    body: (
      <>
        <p>
          Metric (kg / m/s / m³) or Imperial (lb / ft/s / ft³). Physics is metric internally;
          the toggle only changes how results are displayed.
        </p>
      </>
    ),
  },
} satisfies Record<string, HelpEntry>;
