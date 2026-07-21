# Product Specification — Rocket Stage Builder

**Working title:** StageCraft (placeholder)
**Document version:** 0.1 (draft for review)
**Date:** July 19, 2026
**Status:** Concept specification — Phase 1 (physics sandbox) and Phase 2 (economics advisor)

---

## 1. Product overview

StageCraft is a browser-based interactive sandbox that lets a user assemble a multi-stage launch vehicle by dragging propulsion modules from a "pantry" onto a vertical assembly canvas, specify a payload and destination, and immediately see whether the design can physically reach orbit — and if so, exactly how much propellant each stage requires.

The core engine is the Tsiolkovsky rocket equation applied stage-by-stage with realistic specific impulse, structural mass fractions, and thrust-to-weight constraints. The product is deliberately honest physics: designs that cannot work (a single-stage kerosene rocket, an ion-engine first stage, a cold-gas booster) fail visibly, with an explanation of *why* — turning every failure into a teaching moment.

Phase 2 layers an economics and practicality advisor on top of the physics: cost estimation, operational-complexity scoring, and a rules-based (optionally LLM-augmented) suggestions engine that nudges the user from a physics-optimal design toward a commercially sensible one.

### 1.1 Goals

1. Make the rocket equation *tangible* — users learn by assembling, failing, and iterating.
2. Answer three questions for any assembly: (A) Is it valid? (B) Can it carry the specified payload to the specified destination? (C) What propellant quantities does it need?
3. In Phase 2, answer a fourth: (D) Is it commercially sensible, and if not, what should change?

### 1.2 Non-goals

- Trajectory simulation, 6-DOF flight dynamics, or aerodynamic modeling (delta-v losses are captured as fixed budgets per destination, not simulated).
- CAD-level geometry. Stages are rendered as stylized modules, not dimensioned hardware.
- Real vehicle certification or engineering-grade output. This is an educational/exploratory tool.

### 1.3 Target users

- Students and educators (aerospace intro courses, STEM outreach).
- Space enthusiasts exploring "what if" designs.
- Professionals wanting a quick staging trade-study calculator.

---

## 2. Core user flow

1. **Set the mission.** User picks a destination (LEO, SSO, GTO, TLI, or custom delta-v) and specifies payload mass in kg — either directly or via presets.
2. **Build the stack.** User drags propulsion modules from the pantry onto the canvas. First module dropped becomes Stage 1 (bottom); subsequent modules stack on top in order. Modules can be reordered, swapped, or removed. Optional: strap-on solid boosters attach beside Stage 1.
3. **Run.** User presses **Analyze** (or the engine runs live on every change — see §6.6). The solver sizes each stage, checks constraints, and renders the verdict.
4. **Read results.** A verdict panel shows PASS/FAIL with reasons, per-stage propellant masses (split into fuel and oxidizer), gross liftoff mass, payload fraction, and a delta-v waterfall chart.
5. **Iterate.** User tweaks the stack and watches results update.
6. **(Phase 2) Optimize for reality.** User opens the Economics tab: cost breakdown, complexity score, and ranked suggestions ("Replace the hydrogen first stage with methane; add solid boosters; expect −38% estimated vehicle cost for −9% payload margin").

---

## 3. The propulsion pantry

Each pantry item is a *propulsion module*: a stage archetype defined by its propellant combination. The user does not size the stage — the solver does. The pantry displays each module as a card with its headline stats and a short character description.

### 3.1 Module catalog (Phase 1 data set)

| # | Module | Isp sea level (s) | Isp vacuum (s) | Structural fraction ε | Mixture ratio (ox:fuel by mass) | Max stage TWR class | Restart / throttle | Lift-capable? | Notes shown to user |
|---|--------|------------------:|---------------:|----------------------:|--------------------------------:|---------------------|--------------------|---------------|---------------------|
| 1 | Solid (HTPB/AP composite) | 240 | 268 | 0.10 | pre-mixed (n/a) | Very high | No / No | Yes | Simple, dense, huge thrust; cannot shut down; lowest Isp of the lift-capable options |
| 2 | Kerosene / LOX (kerolox) | 300 | 340 | 0.06 | 2.3 : 1 | High | Limited / Yes | Yes | The dense workhorse; best first-stage all-rounder |
| 3 | Methane / LOX (methalox) | 330 | 365 | 0.07 | 3.6 : 1 | High | Yes / Yes | Yes | Modern balance of Isp, density, and clean burn |
| 4 | Hydrogen / LOX (hydrolox) | 370 | 450 | 0.11 | 6.0 : 1 | Moderate | Yes / Yes | Yes (with warning) | Highest Isp; bulky cryogenic tanks; thrust-poor at liftoff |
| 5 | Hypergolic (NTO/UDMH) | 285 | 320 | 0.08 | 2.1 : 1 | Moderate | Yes / Yes | Yes | Storable, instant ignition, ultra-reliable; toxic (flagged in Phase 2) |
| 6 | Cold gas (compressed air/N₂) | 60 | 70 | 0.35 | n/a | Very low | Yes / Yes | No | Deliberate teaching trap: tank mass exceeds achievable impulse for launch |
| 7 | Ion / electric | n/a | 3,000 | 0.30 | n/a | ~10⁻⁴ (milli-g) | Yes / Yes | No | In-space only; thrust measured in millinewtons — included to show why |

Notes:

- **ε (structural fraction)** = dry stage mass ÷ (dry + propellant), inclusive of engines, tanks, plumbing, and interstage share. These are simplified single numbers per archetype; a future version may expose them as tunable "technology level" sliders (see §10).
- **Isp selection rule:** Stage 1 (and strap-on boosters) use a trajectory-averaged value = 0.85 × sea-level + 0.15 × vacuum. All upper stages use vacuum Isp.
- **Lift-capable flag** drives validation rule V-3 (§6.4). Cold gas and ion modules can only be placed as the topmost stage and only for in-space delta-v segments; in Phase 1 they simply fail validation with an explanatory message if placed in a lift position.
- All constants live in a versioned JSON data file (§8.1) so the catalog can be tuned without code changes.

### 3.2 Strap-on boosters (stretch goal, Phase 1.1)

Solid modules may optionally be attached as side boosters to Stage 1 (0, 2, or 4). Boosters burn in parallel with Stage 1; the solver treats booster burnout as "Stage 0" separation using the standard parallel-staging approximation (combined effective Isp weighted by mass flow). If cut from Phase 1, the UI simply doesn't offer lateral drop zones.

---

## 4. Mission definition

### 4.1 Destination presets (delta-v budgets, losses included)

| Destination | Required Δv (m/s) | Notes |
|-------------|------------------:|-------|
| Low Earth orbit (LEO, ~200 km) | 9,400 | Includes ~1.6 km/s gravity + drag + steering losses |
| Sun-synchronous orbit (SSO) | 9,700 | Higher inclination penalty |
| Geostationary transfer orbit (GTO) | 11,900 | LEO + ~2.5 km/s |
| Trans-lunar injection (TLI) | 12,600 | LEO + ~3.2 km/s |
| Custom | user-entered 1,000–15,000 | Advanced mode |

### 4.2 Payload input

- Free-form numeric input in kg (range 1 – 200,000; validation on bounds).
- Presets with realistic masses:
  - CubeSat — 25 kg
  - Small satellite — 500 kg
  - Communications satellite — 3,500 kg
  - Cargo capsule — 6,500 kg
  - **Crew capsule, 2 astronauts — 9,500 kg**
  - Crew capsule, 4 astronauts — 12,500 kg
- **Educational note (required UX):** when a crew preset is selected, show an info callout explaining that "2 astronauts" is not 160 kg — the payload includes the pressurized capsule, life support, heat shield, parachutes, and launch-abort system, which is why crewed payloads start near 10 tonnes. This preempts the most common user misconception.
- Crewed presets set `crewed = true` on the mission, which activates extra validation (V-7) and Phase 2 reliability weighting.

---

## 5. Assembly canvas (UI specification)

### 5.1 Layout

Three-panel layout (responsive; panels stack on mobile):

- **Left — Pantry.** Scrollable card list of propulsion modules (§3.1). Cards are draggable. Each card shows: name, Isp (SL/vac), a 1–5 "density" pip indicator, and tags (e.g., `cryogenic`, `storable`, `no-shutdown`, `toxic`, `in-space-only`).
- **Center — Assembly canvas.** A vertical stack area with a launch-pad graphic at the bottom. Drop zones appear between existing stages and at the top. Stages render as stylized cylinders whose *height scales with computed propellant mass* after each solve (log scale, clamped), giving immediate visual feedback that hydrogen stages are physically huge and solids compact. A payload fairing icon sits on top, labeled with the payload mass.
- **Right — Mission & results.** Mission inputs (destination, payload) on top; verdict panel and results below (§7).

### 5.2 Interactions

- **Drag from pantry → canvas:** inserts a stage at the drop position. Bottom = Stage 1.
- **Drag within canvas:** reorders stages. Stage numbers re-derive from position (bottom = 1).
- **Click a stage:** opens a detail drawer — per-stage results, and (advanced mode) a manual Δv-allocation override slider.
- **Remove:** drag off-canvas or click ✕.
- **Stage limit:** 1–5 stages (boosters excluded). Attempting a 6th shows a tooltip: real vehicles rarely exceed 4 stages; each staging event adds failure risk and dead mass.
- **Live vs. explicit solve:** default is live re-solve (debounced 300 ms) with an **Analyze** button retained for accessibility and for mobile.
- **Accessibility:** all drag-drop actions must have keyboard equivalents (select module → "insert at position" menu). WCAG 2.1 AA.

### 5.3 Visual verdict language

- Valid + feasible: stack outlined in green; verdict banner "REACHES ORBIT".
- Valid but infeasible for payload: amber; banner "CLOSES ONLY AT ___ kg — reduce payload or improve staging".
- Invalid assembly: red; offending stage pulses; banner lists violated rules in plain language.

---

## 6. Physics engine specification

### 6.1 Notation

For stage *i* (numbered 1 = bottom to N = top):
- `Ve_i = Isp_i × g0` (effective exhaust velocity, g0 = 9.80665 m/s²; Isp per selection rule §3.1)
- `ε_i` = structural fraction; dry mass `ms_i = (ε_i / (1 − ε_i)) × mp_i` where `mp_i` = propellant mass
- `m_above_i` = total mass sitting on top of stage i (all upper stages + payload)
- `R_i = exp(Δv_i / Ve_i)` = required mass ratio for stage i's delta-v allocation

### 6.2 Stage sizing (top-down closed form)

Given a delta-v allocation `Δv_i` per stage, size from the top stage downward. For each stage, from the rocket equation `R_i = (mp_i + ms_i + m_above_i) / (ms_i + m_above_i)`:

```
k_i   = ε_i / (1 − ε_i)                    (dry-mass per unit propellant)
mp_i  = (R_i − 1) × m_above_i / (1 − (R_i − 1) × k_i)
ms_i  = k_i × mp_i
m_above_(i−1) = m_above_i + mp_i + ms_i
```

**Feasibility condition (per stage):** the denominator `1 − (R_i − 1) × k_i` must be > 0. If ≤ 0, the stage *cannot achieve its delta-v allocation at any size* — adding propellant adds tank mass faster than performance. This is surfaced verbatim as the failure reason ("A kerosene stage physically cannot deliver 9,400 m/s alone — its tanks outgrow its propellant. This is why rockets stage.").

Gross liftoff mass `GLOW = m_above_0`. Payload fraction = payload ÷ GLOW.

### 6.3 Delta-v allocation between stages

Two modes:

1. **Auto (default):** the solver finds the allocation `{Δv_i}` minimizing GLOW subject to `Σ Δv_i = Δv_required` and each stage's feasibility condition. Implementation: numeric optimization (projected gradient or Nelder–Mead over the N−1 free split variables; N ≤ 5 keeps this trivial, target < 50 ms). Initial guess: allocate proportionally to `Ve_i` (higher-Isp stages take more of the burden — the Saturn V pattern).
2. **Manual (advanced mode):** per-stage sliders; solver holds the user's split and reports the resulting GLOW next to the auto-optimal GLOW so the user sees the cost of their choice.

### 6.4 Validation rules (Question A — "does the assembly work?")

| ID | Rule | Failure message style |
|----|------|----------------------|
| V-1 | At least 1 stage present | "Add a propulsion stage to begin." |
| V-2 | Payload mass entered and within bounds | — |
| V-3 | Stage 1 (and boosters) must be lift-capable (`lift_capable = true`) | "Ion engines produce millinewtons of thrust — superb in space, useless against gravity. Move it to the top stage or remove it." |
| V-4 | Liftoff TWR ≥ 1.2. Computed as: max deliverable thrust class of Stage 1's archetype vs GLOW. Each archetype carries a `max_twr_at_liftoff` parameter (solid 2.5, kerolox 1.8, methalox 1.8, hydrolox 1.3, hypergolic 1.5). If the archetype's max < 1.2 for the sized vehicle configuration, fail. Hydrolox Stage 1 without boosters passes only with a persistent warning badge ("thrust-poor — real vehicles like Delta IV accept this; most add boosters"). | Plain-language + suggestion |
| V-5 | Every stage satisfies the sizing feasibility condition (§6.2) | Explains the tank-growth spiral |
| V-6 | Upper stages: initial TWR ≥ 0.4 (informational warning below 0.7, hard fail below 0.4 — excessive gravity losses not captured by fixed budgets) | Warning/fail |
| V-7 | Crewed missions: no solid-only stack (no shutdown capability = no abort); warning if any stage is hypergolic (toxicity near crew) | Safety-framed message |
| V-8 | Cold gas anywhere in the lift path → fail with the Isp/tank-mass explanation | Teaching-trap message |

### 6.5 Feasibility & quantities (Questions B and C)

If validation passes and the solver closes:

- **B — Payload feasibility:** binary PASS, plus computed **max payload** for the current stack (found by bisection on payload mass until the solve stops closing) so the amber state can report margin: "Your stack closes at up to 11,200 kg — 1,700 kg of margin over your 9,500 kg capsule."
- **C — Propellant quantities per stage:**
  - Total propellant `mp_i` (kg and tonnes)
  - Split into oxidizer and fuel via mixture ratio: `m_ox = mp × MR/(1+MR)`, `m_fuel = mp × 1/(1+MR)` (solids report a single grain mass)
  - Approximate tank volumes from propellant densities (RP-1 810, LOX 1,141, LH2 71, LCH4 423, NTO 1,440, UDMH 790 kg/m³) — this is what makes hydrogen's bulk visceral
  - Stage dry mass, stage total mass

### 6.6 Performance requirements

- Full solve (auto-allocation, 5 stages) < 100 ms on a mid-range laptop; live re-solve debounced at 300 ms.
- Engine implemented as a pure, dependency-free TypeScript module (`@stagecraft/engine`) with 100% deterministic outputs — enables unit testing against known vehicles (§9).

---

## 7. Results presentation

### 7.1 Verdict panel

- Banner (green/amber/red per §5.3) with the one-line verdict.
- **Delta-v waterfall chart:** horizontal stacked bar showing each stage's contribution against the required budget.
- **Mass breakdown chart:** stacked bar of GLOW = payload + Σ(dry + propellant per stage), color-coded by stage.
- Key figures: GLOW, payload fraction (%), total propellant mass, stage count.

### 7.2 Per-stage cards

For each stage: propellant type, allocated Δv, Isp used, mass ratio, propellant mass (fuel/ox split), dry mass, est. tank volume, TWR at ignition. Amber/red badges for warnings attached to that stage.

### 7.3 Comparison tray (stretch)

"Pin" up to 3 designs; side-by-side table of GLOW, payload fraction, and (Phase 2) cost. Encourages the experimentation loop that is the product's whole point.

---

## 8. Data model

### 8.1 Propulsion catalog (static JSON, versioned)

```json
{
  "catalog_version": "1.0",
  "modules": [
    {
      "id": "kerolox",
      "name": "Kerosene / LOX",
      "isp_sl_s": 300,
      "isp_vac_s": 340,
      "structural_fraction": 0.06,
      "mixture_ratio_ox_to_fuel": 2.3,
      "densities_kg_m3": { "fuel": 810, "oxidizer": 1141 },
      "max_twr_at_liftoff": 1.8,
      "lift_capable": true,
      "restartable": true,
      "throttleable": true,
      "tags": ["cryo-ox", "dense", "workhorse"],
      "economics": {
        "propellant_cost_usd_per_kg": { "fuel": 2.0, "oxidizer": 0.2 },
        "hardware_cost_usd_per_kg_dry": 2500,
        "ops_complexity": 2,
        "toxicity": 0,
        "reuse_suitability": 3
      }
    }
  ]
}
```

### 8.2 Design document (user state, serializable/sharable)

```json
{
  "schema_version": "1.0",
  "mission": { "destination": "LEO", "delta_v_m_s": 9400, "payload_kg": 9500, "crewed": true },
  "stack": [
    { "position": 1, "module_id": "kerolox", "boosters": { "module_id": "solid", "count": 2 } },
    { "position": 2, "module_id": "hydrolox" }
  ],
  "allocation_mode": "auto",
  "manual_allocation_m_s": null
}
```

Designs are shareable via URL-encoded state (no account required for Phase 1); optional accounts + saved designs are a later enhancement.

### 8.3 Solve result (engine output contract)

```json
{
  "valid": true,
  "violations": [],
  "warnings": [{ "rule": "V-4", "stage": 1, "message": "..." }],
  "feasible_for_payload": true,
  "max_payload_kg": 11200,
  "glow_kg": 498300,
  "payload_fraction": 0.0191,
  "stages": [
    {
      "position": 1,
      "delta_v_m_s": 3900,
      "isp_used_s": 306,
      "mass_ratio": 3.58,
      "propellant_kg": 352000,
      "fuel_kg": 106667,
      "oxidizer_kg": 245333,
      "dry_kg": 22468,
      "tank_volume_m3": 346,
      "twr_ignition": 1.42
    }
  ]
}
```

---

## 9. Verification & acceptance criteria (Phase 1)

The engine ships with a test suite anchored to hand-computed references and sanity checks against real vehicles:

1. **Single-stage kerolox to LEO fails** with V-5 (tank-growth spiral) — the canonical demonstration.
2. **Two-stage kerolox/kerolox, 500 t GLOW cap:** payload ≈ 3–4% of GLOW (matches Falcon-9-class reality within model simplifications).
3. **Kerolox + hydrolox upper stage** beats kerolox/kerolox payload by 25–40% at equal GLOW (Saturn-V logic).
4. **Ion first stage fails V-3; cold gas anywhere in lift path fails V-8**, each with the specified teaching message.
5. **Crewed + all-solid stack fails V-7.**
6. Auto-allocation GLOW ≤ manual equal-split GLOW for all test stacks (optimizer sanity).
7. Bisection max-payload agrees with direct solve to within 0.1%.
8. Deterministic outputs: identical input → identical output across runs and browsers.

UX acceptance: a first-time user can go from empty canvas to a green verdict (2-stage kerolox/hydrolox, 3,500 kg comsat, LEO) in under 2 minutes without documentation.

---

## 10. Phase 2 — Economics & practicality advisor

Phase 2 answers: *"It flies — but should anyone build it?"* It adds a second tab to the results panel and a suggestions engine. Physics results are never altered; economics is a lens on top.

### 10.1 Cost model

Per design, estimate:

- **Propellant cost:** Σ per-stage (fuel_kg × fuel $/kg + ox_kg × ox $/kg). Defaults: RP-1 $2.0, LOX $0.2, LH2 $6.0, LCH4 $1.0, NTO/UDMH $80 (blended), solid grain $5 per kg. (Deliberately illustrative; all values editable in an assumptions drawer and clearly labeled as rough 2020s-era figures.)
- **Hardware cost:** Σ dry_kg × archetype $/kg-dry (solid $1,200; kerolox $2,500; methalox $2,800; hydrolox $4,500; hypergolic $3,500).
- **Operations multiplier:** product of per-archetype ops_complexity factors (1 = simple … 5 = burdensome). Hydrolox and hypergolics score high (deep-cryo handling; toxic-propellant ground crews in SCAPE suits).
- **Reusability toggle (stretch):** marking Stage 1 reusable applies a payload penalty (−30% effective Stage-1 performance for legs/margin/landing propellant, modeled as a Δv tax) and amortizes Stage-1 hardware over a user-set flight count. The tab shows cost-per-flight and cost-per-kg both ways — letting users rediscover the Falcon 9 trade themselves.

Headline outputs: estimated vehicle cost, cost per flight, **cost per kg to orbit**, ops complexity score (1–10), and a commonality indicator.

### 10.2 Suggestions engine (rules-based core)

Deterministic rules evaluated against the current design, each emitting a suggestion card with estimated impact:

| ID | Trigger | Suggestion |
|----|---------|-----------|
| S-1 | Different propellants on stages 1 and 2 with < 10% payload gain vs. common-propellant variant (engine auto-runs the counterfactual) | "Commonality: one propellant family cuts infrastructure and engine development. Est. cost −X% for payload −Y%." |
| S-2 | Hydrolox on Stage 1 | "Hydrogen down low buys little (thrust-poor, huge tanks in the drag regime). Consider methalox/kerolox first stage; keep hydrogen up top." |
| S-3 | Hypergolics anywhere, crewed or high flight-rate mission | Toxicity/ops cost flag; suggest storable→methalox swap with impact numbers. |
| S-4 | Payload margin > 40% | "Your rocket is oversized for the mission — shrink or fly rideshare." |
| S-5 | Stage count > 3 | Reliability note: each separation event is a discrete failure mode; show 2-vs-N-stage cost/reliability comparison. |
| S-6 | All-solid stack, uncrewed | Note the niche where this is genuinely right (small launchers, responsive launch) — suggestions can also *validate*. |
| S-7 | Reuse off, high modeled flight rate | Run the reuse counterfactual and present the break-even flight count. |

Every suggestion is backed by an actual counterfactual solve, not canned text — impact numbers are computed, and each card has an **Apply** button that mutates the stack so the user can see for themselves.

### 10.3 LLM-augmented advisor (optional layer)

A "Explain this design like an aerospace consultant" action sends the design document + solve result + suggestion list to an LLM (Anthropic API) with a constrained prompt to produce a narrative assessment — historical analogies ("your stack is essentially a small Ariane 5"), market framing, and prioritized next steps. Strictly additive: all numbers come from the deterministic engine; the LLM narrates, never calculates. Responses cached per design hash.

### 10.4 Phase 2 acceptance criteria

1. Kerolox/hydrolox physics-optimal design triggers S-1 with a computed common-methalox counterfactual.
2. Reuse toggle reproduces the expected pattern: payload down ~10–15% at vehicle level, cost/kg down at ≥ ~5 flights amortization.
3. Every suggestion's "Apply" produces exactly the impact numbers advertised on its card.
4. All economic assumptions are user-visible and editable; changing them re-ranks suggestions live.

---

## 11. Technical architecture

- **Frontend:** React + TypeScript SPA. Drag-and-drop via dnd-kit (accessible, touch-friendly). Charts via Chart.js or Recharts. State in URL-serializable store (Zustand).
- **Physics engine:** pure TypeScript package, zero DOM dependencies, unit-tested standalone (§9). Runs entirely client-side — no server needed for Phase 1.
- **Phase 2 LLM calls:** thin serverless proxy to the Anthropic API (key custody server-side); everything else remains static hosting.
- **Persistence:** Phase 1 = URL state + local storage for pinned designs. Accounts deferred.
- **Telemetry (opt-in):** anonymized design-attempt events to learn which failure modes users hit most (informs teaching-message tuning).

---

## 12. Open questions for review

1. Should strap-on boosters ship in Phase 1 or 1.1? (They complicate the solver modestly but unlock the most iconic real-world configurations.)
2. Expose structural fraction as a per-stage "technology level" slider (steel ↔ balloon-tank), or keep archetypes fixed for simplicity?
3. Include an in-space mission mode (LEO → GTO transfer stage sizing) where ion/cold-gas modules become legitimately usable, rather than existing only as teaching traps?
4. Gamification: challenge scenarios ("lift 2 astronauts for under $X estimated cost") — Phase 2.1?
5. Unit toggle (metric-only vs. metric+imperial display)?

---

*Model simplifications are intentional and should be stated in-app: fixed loss budgets instead of trajectory integration, single-number structural fractions, engine mass folded into ε, and no fairing/interstage line items. The tool teaches staging physics honestly at the cost of ~±10–15% fidelity against real vehicles — the right trade for its purpose.*