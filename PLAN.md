# PropelX — Implementation Plan

**Product:** PropelX (rocket stage builder)
**White-label owner:** BlueDrop, LLC
**Companion spec:** [Product Specification — Rocket Stage B.md](Product%20Specification%20—%20Rocket%20Stage%20B.md)
**Plan version:** 0.1 (draft for review)
**Date:** 2026-07-20

> The specification uses the placeholder name "StageCraft". This plan uses the product's actual name **PropelX** throughout (per `.env` — `WL_PRODUCT`). Where the spec says StageCraft, read PropelX.

---

## 0. Reading guide

- Milestones M0–M7 deliver Phase 1 (shippable). M8 is the Phase 1 "1.1" stretch bundle. M9–M12 deliver Phase 2.
- Every acceptance criterion in spec §9 and §10.4 is mapped to a specific milestone exit.
- File paths assume a **pnpm monorepo** rooted at `/Users/ajayrambhia/Downloads/PropelX`. Rationale in §1.
- Spec citations use `§X.Y` throughout; open both docs side-by-side.

---

## 1. Cross-cutting architectural decisions (resolve at M0)

| Decision | Recommendation | Rationale |
|---|---|---|
| Repo shape | **pnpm workspaces monorepo** with packages `engine`, `web`, `proxy`, `suggestions` | Engine must ship as a pure zero-dep TS module (§6.6, §11); worth isolating. LLM proxy sits alongside without a second repo. |
| Package manager | **pnpm** | Fast, deterministic, first-class workspace support. |
| Chart library | **Recharts** | React-native API; SVG output is screenshot-testable and accessible. |
| Drag/drop | **dnd-kit** (spec §11) | `KeyboardSensor` is needed for WCAG 2.1 AA (§5.2). |
| State | **Zustand** (spec §11) with a design-state store + derived solve-result slice | `subscribeWithSelector` lets the solver subscribe cheaply. |
| URL serialization | Base64URL-encoded gzipped JSON of the design document (§8.2) in the hash fragment | Hash keeps it client-only; gzip fits typical designs under 200 chars. |
| Testing | Vitest for unit/component; Playwright for the "2-minute-to-green" UX test (§9) | Vitest shares Vite config; Playwright is required for the wall-clock UX assertion. |
| Node/TS versions | Node 20 LTS, TypeScript 5.5, `"strict": true`, `"noUncheckedIndexedAccess": true` | Strict flags catch propellant/stage indexing errors. |
| LLM provider | **Together.ai** (per `.env` `TOGETHER_AI_API_KEY`) — **not** Anthropic as spec §10.3 suggests | Aligns with existing PropelX infrastructure. Together's OpenAI-compatible API means we can swap models freely. See §"LLM provider substitution" below. |
| LLM proxy runtime | Cloudflare Workers or Node.js/Express | Together.ai key custody must stay server-side. |

### 1.1 LLM provider substitution (spec §10.3 correction)

Spec §10.3 says "sends… to an LLM (Anthropic API)". The product's `.env` provisions a **Together.ai** key instead. This changes M11 details but not the design:

- Proxy targets `https://api.together.xyz/v1/chat/completions` (OpenAI-compatible).
- Model choice: default to a strong instruction-following model available on Together (e.g., `meta-llama/Llama-3.3-70B-Instruct-Turbo` or a Qwen variant); make model id a config value.
- Prompt-caching semantics differ from Anthropic's — Together does not offer prompt cache TTLs. Rely purely on our own KV cache keyed by design hash (spec §10.3 asks for this anyway).
- The spec's numeric-safety constraint ("LLM narrates, never calculates") still holds — enforce via post-check (M11).

---

## 2. Branding & white-label

Values come from `.env`; hard-coded strings are forbidden in the app.

| Field | Source | Value |
|---|---|---|
| Product name | `WL_PRODUCT` | `PropelX` |
| Wordmark scheme | `WL_PRODUCT` scheme block | "Propel" = `#FFFFFF`, "X" = `#6AA94F` (accent green) |
| White-label owner | `WHITELABEL` | `BlueDrop, LLC` |
| Version banner | `PRODUCT_VERSION` | `1.0.0 | Release Date: 2024-06-15 | Build: 1.0.0-rc1` |
| Copyright | Derived | `© 2026 BlueDrop, LLC. All rights reserved.` |

Implementation notes:

- Vite exposes `import.meta.env.VITE_*` at build time. Prefix the branding vars with `VITE_` in a `.env.local` used by the web package (never commit the Together key with a `VITE_` prefix — it would ship to the browser).
- Wordmark component `packages/web/src/branding/Wordmark.tsx` parses the `WL_PRODUCT` scheme string (`"Propel|#FFFFFF"`, `"X|#6AA94F"`) so the wordmark colors can change without a code edit.
- The accent green `#6AA94F` becomes the primary success color for the verdict banner's "REACHES ORBIT" green state (§5.3) — reuse it rather than introducing a second green.
- Footer renders `© {year} {WHITELABEL}` and the version banner in muted text.
- Never log or ship the Together.ai key to the client. Add an ESLint rule barring `VITE_TOGETHER*` env references.

### 2.1 Secret handling

- `.env` at the repo root already contains the Together.ai key. Add `.env` to `.gitignore` at M0 if not already ignored (check first — the file exists and must not be committed).
- The proxy (M11) reads `TOGETHER_AI_API_KEY` from its own environment; the web package must not.
- Add a repo-root `.env.example` documenting the shape without values.

---

## 3. Proposed repo layout

```
/Users/ajayrambhia/Downloads/PropelX/
├── PLAN.md
├── Product Specification — Rocket Stage B.md
├── .env                            # exists; DO NOT COMMIT — contains Together.ai key
├── .env.example                    # add at M0
├── .gitignore                      # add at M0; must include .env
├── package.json                    # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
├── .github/workflows/ci.yml
└── packages/
    ├── engine/                     # @propelx/engine — pure TS, zero deps
    │   ├── src/
    │   │   ├── index.ts            # public API: solve(), maxPayload(), validate()
    │   │   ├── types.ts            # DesignDoc, SolveResult, Module, Mission
    │   │   ├── catalog.ts          # loadCatalog(), CatalogModule
    │   │   ├── constants.ts        # G0, destination Δv table, densities
    │   │   ├── sizing.ts           # §6.2 closed-form per-stage sizing
    │   │   ├── allocator.ts        # §6.3 auto delta-v allocation optimizer
    │   │   ├── validation.ts       # §6.4 rules V-1…V-8
    │   │   ├── bisection.ts        # §6.5 max-payload search
    │   │   ├── boosters.ts         # §3.2 parallel-staging (M8)
    │   │   └── solve.ts            # orchestrator: validate → allocate → size → verify
    │   ├── data/
    │   │   └── catalog.v1.json     # §8.1 catalog
    │   ├── test/
    │   │   ├── sizing.test.ts
    │   │   ├── allocator.test.ts
    │   │   ├── validation.test.ts
    │   │   ├── bisection.test.ts
    │   │   ├── acceptance.test.ts  # §9 tests 1–8
    │   │   └── fixtures/
    │   ├── package.json
    │   └── tsconfig.json
    ├── web/                        # @propelx/web — React SPA
    │   ├── index.html
    │   ├── vite.config.ts
    │   ├── src/
    │   │   ├── main.tsx
    │   │   ├── App.tsx
    │   │   ├── branding/
    │   │   │   ├── Wordmark.tsx           # parses WL_PRODUCT scheme
    │   │   │   ├── Footer.tsx             # copyright + version banner
    │   │   │   └── theme.ts               # exports accent #6AA94F
    │   │   ├── state/
    │   │   │   ├── designStore.ts         # Zustand store for §8.2
    │   │   │   ├── solveSelectors.ts      # derived solve result
    │   │   │   └── urlSync.ts             # hash-fragment serialization
    │   │   ├── mission/
    │   │   │   ├── MissionPanel.tsx       # §4
    │   │   │   ├── DestinationPicker.tsx
    │   │   │   ├── PayloadPresets.tsx
    │   │   │   └── CrewedCallout.tsx      # §4.2 educational note
    │   │   ├── pantry/
    │   │   │   ├── Pantry.tsx             # §5.1 left panel
    │   │   │   └── ModuleCard.tsx
    │   │   ├── canvas/
    │   │   │   ├── AssemblyCanvas.tsx     # §5.1 center panel
    │   │   │   ├── StageSprite.tsx        # height scales with mp_i (§5.1)
    │   │   │   ├── DropZone.tsx
    │   │   │   ├── PayloadFairing.tsx
    │   │   │   └── keyboardInsert.ts      # §5.2 keyboard equivalent
    │   │   ├── results/
    │   │   │   ├── VerdictBanner.tsx      # §5.3, §7.1
    │   │   │   ├── DeltaVWaterfall.tsx    # §7.1
    │   │   │   ├── MassBreakdown.tsx      # §7.1
    │   │   │   ├── StageCard.tsx          # §7.2
    │   │   │   └── ComparisonTray.tsx     # §7.3 (M8)
    │   │   ├── economics/                 # M9–M11
    │   │   │   ├── EconomicsTab.tsx
    │   │   │   ├── CostBreakdown.tsx
    │   │   │   ├── AssumptionsDrawer.tsx
    │   │   │   ├── ReuseToggle.tsx
    │   │   │   ├── SuggestionsPanel.tsx
    │   │   │   └── AdvisorNarrative.tsx   # M11 — calls proxy
    │   │   ├── lib/
    │   │   │   ├── format.ts              # kg/tonnes/m³ formatting
    │   │   │   ├── debounce.ts            # 300 ms live re-solve (§6.6)
    │   │   │   └── telemetry.ts           # §11 opt-in
    │   │   └── styles/
    │   ├── test/                          # Vitest + Testing Library
    │   ├── e2e/                           # Playwright specs incl. §9 UX test
    │   ├── package.json
    │   └── tsconfig.json
    ├── suggestions/                # @propelx/suggestions (M10)
    │   ├── src/
    │   │   ├── index.ts            # runSuggestions(design, solve)
    │   │   ├── rules/              # one file per rule S-1…S-7
    │   │   │   ├── s1-commonality.ts
    │   │   │   ├── s2-hydrolox-first.ts
    │   │   │   ├── s3-hypergolic.ts
    │   │   │   ├── s4-oversized.ts
    │   │   │   ├── s5-stage-count.ts
    │   │   │   ├── s6-all-solid.ts
    │   │   │   └── s7-reuse.ts
    │   │   ├── counterfactual.ts   # mutate design, re-solve
    │   │   └── economics.ts        # §10.1 cost model
    │   └── test/
    └── proxy/                      # @propelx/proxy — M11 Together.ai proxy
        ├── src/
        │   ├── index.ts            # POST /advise
        │   ├── together.ts         # Together.ai HTTP client
        │   ├── prompt.ts           # constrained prompt (§10.3)
        │   └── cache.ts            # KV cache keyed by design hash
        └── package.json
```

---

## 4. Milestone breakdown

### M0 — Repo scaffolding

- **Entry:** empty PropelX directory (current state).
- **Work:**
  - Initialize pnpm workspace: root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` with strict flags.
  - Add `.eslintrc.cjs`, `.prettierrc`, `.editorconfig`, `.gitignore` — **verify `.env` is ignored** (contains Together.ai key).
  - Add `.env.example` mirroring the schema of `.env` without values.
  - Add empty stubs for `packages/engine`, `packages/web`, `packages/proxy` (and `packages/suggestions` at M10) with per-package `package.json` and `tsconfig.json` extending base.
  - Add `.github/workflows/ci.yml` running `pnpm -r lint && pnpm -r test && pnpm -r build`. Ensure CI does **not** load `.env`.
  - Add `README.md` with quickstart and a "credentials" section documenting `TOGETHER_AI_API_KEY`, `WHITELABEL`, `WL_PRODUCT`, `PRODUCT_VERSION`.
- **Exit:** `pnpm install && pnpm -r build` succeeds; CI green.
- **Cross-cutting locks:** repo shape, chart library, node/TS versions.

---

### M1 — Physics engine (the crown-jewel milestone)

Largest and most rigorous milestone; all downstream UI depends on its correctness. Break into sub-tasks and do them in order.

#### M1.1 — Types & catalog loading (foundation)

- **Files:** [packages/engine/src/types.ts](packages/engine/src/types.ts), [packages/engine/src/catalog.ts](packages/engine/src/catalog.ts), [packages/engine/src/constants.ts](packages/engine/src/constants.ts), [packages/engine/data/catalog.v1.json](packages/engine/data/catalog.v1.json).
- **Deliverables:**
  - `DesignDoc` and `SolveResult` types mirror §8.2 and §8.3 exactly. Discriminated union for `Violation | Warning` keyed by rule ID.
  - `CatalogModule` type mirrors §8.1 including the `economics` sub-object (populate now, unused until Phase 2 — cheaper than migrating later).
  - `catalog.v1.json` populated for all seven modules in §3.1 with the exact numbers from the table and §10.1 cost defaults.
  - `constants.ts`: `G0 = 9.80665`, destination Δv table from §4.1, propellant densities from §6.5.
  - `loadCatalog()` returns a frozen catalog keyed by module id; validates schema at import time.
- **Exit:** unit test loads catalog, asserts all seven modules present and frozen.

#### M1.2 — Per-stage sizing closed form (§6.2)

- **File:** [packages/engine/src/sizing.ts](packages/engine/src/sizing.ts).
- **API:** `sizeStage(module, deltaV, mAbove, ispMode): { mp, ms, mAboveBelow, feasible, reason? }`.
- **Implementation:** exact equations from §6.2. Compute `Ve` per §3.1 Isp selection rule: Stage 1 uses `0.85*Isp_sl + 0.15*Isp_vac`; upper stages use `Isp_vac`. Return `feasible=false` when denominator `1 − (R − 1) × k ≤ 0` with the verbatim reason string from spec §6.2.
- **Tests:**
  - Hand-computed reference: kerolox stage, Δv=3000, m_above=10 t — check `mp`, `ms` against spreadsheet.
  - Infeasibility: single kerolox stage asked for Δv=9400 — `feasible=false`, reason contains "tanks outgrow".

#### M1.3 — Auto delta-v allocator (§6.3)

- **File:** [packages/engine/src/allocator.ts](packages/engine/src/allocator.ts).
- **API:** `autoAllocate(stack, mission, catalog): { allocation: number[], glow: number } | { infeasible: true, reason }`.
- **Algorithm:**
  - Initial guess: allocation proportional to `Ve_i` (higher Isp gets more — Saturn-V pattern, §6.3).
  - Optimization: **Nelder–Mead** over `N−1` free split fractions, parameterized via softmax so `Σ Δv_i = Δv_required` holds automatically. Infeasible configurations return `+∞` GLOW so the boundary doesn't crash the solver.
  - **Why not projected gradient (spec's other suggestion):** the V-5 feasibility condition creates discontinuities. Gradient-free methods handle it cleanly.
  - Termination: relative GLOW change < 1e-6 or 200 iterations.
- **Tests:**
  - Kerolox/kerolox: auto GLOW ≤ equal-split GLOW (§9 test 6).
  - Kerolox/hydrolox: allocator gives the hydrolox stage the larger Δv share.
  - Timing test: 5-stage solve under 50 ms on CI.

#### M1.4 — Validation rules V-1…V-8 (§6.4)

- **File:** [packages/engine/src/validation.ts](packages/engine/src/validation.ts).
- **API:** `validate(design, catalog, sizedResult?): { violations, warnings }`.
- **Structure:** one function per rule returning `Violation | Warning | null`. Split into `preSizingRules` (V-1, V-2, V-3, V-7, V-8) and `postSizingRules` (V-4, V-5, V-6).
- **Notes:**
  - V-4 hydrolox-without-boosters case is a **warning**, not a violation (spec: "passes only with a persistent warning badge").
  - V-6 has both warning threshold (< 0.7) and fail threshold (< 0.4).
  - Messages match the "plain-language + suggestion" style from the spec table verbatim.
- **Tests:** one triggering test and one non-triggering test per rule (16 tests).

#### M1.5 — Max-payload bisection (§6.5)

- **File:** [packages/engine/src/bisection.ts](packages/engine/src/bisection.ts).
- **API:** `maxPayload(design, catalog, tol=0.001): number | null`.
- **Algorithm:** bisect payload on `[1, 200_000]` kg (§4.2 bounds). Return `null` if unbounded (top bound closes); `0` if unfeasible at any payload.
- **Test:** bisection agrees with direct solve at that payload within 0.1% (§9 test 7).

#### M1.6 — Solve orchestrator

- **Files:** [packages/engine/src/solve.ts](packages/engine/src/solve.ts), [packages/engine/src/index.ts](packages/engine/src/index.ts).
- **API:** `solve(design: DesignDoc, catalog: Catalog): SolveResult`.
- **Flow:** pre-sizing validation → allocation (auto or manual) → top-down sizing → post-sizing validation → assemble `SolveResult` per §8.3 (per-stage fuel/ox split, tank volumes, TWR at ignition). Skip sizing if pre-sizing violations exist.
- **Determinism:** no `Math.random`, no `Date.now`, no floating iteration-order dependency.
- **Performance test:** 1000 solves in a loop, assert p99 < 100 ms (§6.6).

#### M1.7 — §9 acceptance suite

- **File:** `packages/engine/test/acceptance.test.ts`.
- **Coverage:** all eight §9 tests, one `it()` per test. Reference vehicle fixtures under `test/fixtures/`.
- **Determinism (§9.8):** run identical design 100 times, assert deep-equal outputs.

**M1 exit:** all 8 §9 tests green; performance target met; engine builds with zero runtime dependencies.

---

### M2 — Data model wiring & Zustand store

- **Entry:** M1 complete.
- **Files:** [packages/web/src/state/designStore.ts](packages/web/src/state/designStore.ts), [packages/web/src/state/solveSelectors.ts](packages/web/src/state/solveSelectors.ts), [packages/web/src/state/urlSync.ts](packages/web/src/state/urlSync.ts).
- **Work:**
  - Zustand store holds `DesignDoc` (§8.2). Actions: `setMission`, `insertStage`, `moveStage`, `removeStage`, `setAllocationMode`, `setManualAllocation`.
  - Derived `useSolveResult()` debounced 300 ms (§5.2, §6.6); calls `solve()`; memoized on design hash.
  - URL sync: read hash on mount, write on change (debounced 500 ms), base64URL + gzip via `pako`.
  - Local-storage "pinned designs" list (feeds M8 comparison tray).
- **Exit:** unit tests for actions; reload-round-trip test for URL sync.

---

### M3 — Mission definition UI (§4)

- **Files:** [packages/web/src/mission/](packages/web/src/mission/).
- **Work:**
  - `DestinationPicker`: dropdown LEO/SSO/GTO/TLI/Custom; custom slider 1,000–15,000 m/s.
  - `PayloadPresets`: preset buttons from §4.2 + free-form input; validation 1–200,000 kg.
  - `CrewedCallout`: exact "2 astronauts is not 160 kg…" text from §4.2. Sets `crewed=true` on mission.
- **Exit:** fields round-trip through store and URL; component tests cover bounds.

---

### M4 — Pantry + assembly canvas (§3, §5)

Largest UI surface. Sub-tasks:

#### M4.1 — Pantry
Reads catalog from `@propelx/engine`; renders `ModuleCard` list; cards draggable via dnd-kit `useDraggable`; show Isp, density pips, tags (§5.1).

#### M4.2 — Assembly canvas base
Vertical stack area with launch-pad graphic; payload fairing on top labeled with payload mass. Drop zones between stages and above top stage. `DndContext` wraps pantry + canvas; sensors: `PointerSensor` + `KeyboardSensor`. Stage numbering derived from array index (bottom = 1). Stage limit 1–5 with tooltip on 6th (§5.2).

#### M4.3 — Stage height scales with propellant (§5.1)
`StageSprite` reads its stage's `propellant_kg` from solve result; `height = clamp(log10(mp) * scale, minH, maxH)`.

**Solve → render → layout coupling (spec risk).** Single `<AssemblyCanvas>` reads `useSolveResult()` once and passes results down as props; sprites never re-solve. Invalid states render sprites at a neutral default height with amber/red outline. CSS transitions on height keep layout stable during infeasible flips.

#### M4.4 — Keyboard equivalents (§5.2, WCAG 2.1 AA)
- Pantry cards focusable; Enter opens "Insert at position…" menu.
- Canvas stages focusable; arrow keys reorder; Delete removes.
- ARIA: `role="list"`, `aria-grabbed`; live region announces "Stage 2 (methalox) inserted".

#### M4.5 — Live re-solve wiring
The M2 debounced selector already handles this; component test verifies payload edit → results within ~350 ms.

**M4 exit:** manual drag/drop works; keyboard-only user builds a 2-stage design end-to-end (Playwright); no dnd-kit a11y warnings.

---

### M5 — Results panel (§7)

- **Files:** [packages/web/src/results/](packages/web/src/results/).
- **Work:**
  - `VerdictBanner`: green/amber/red states per §5.3. Green uses the PropelX accent `#6AA94F`.
  - `DeltaVWaterfall`: Recharts horizontal stacked bar; per-stage Δv vs. required.
  - `MassBreakdown`: stacked bar of GLOW = payload + Σ(dry + propellant per stage), color-coded per stage.
  - `StageCard`: per §7.2 fields — propellant type, Δv, Isp, mass ratio, mp with fuel/ox split, ms, tank volume, TWR ignition, warning badges.
  - Key figures block: GLOW, payload fraction %, total propellant, stage count.
- **Exit:** verdicts correct on §9 test scenarios; screenshot test on LEO 2-stage green case.

---

### M6 — Manual Δv allocation mode (§6.3)

- Stage detail drawer opened by click.
- Per-stage sliders sum-constrained to `Δv_required`; changing one rebalances others proportionally.
- Store toggles `allocation_mode: "manual"`; solver honors `manual_allocation_m_s`.
- Report auto-optimal GLOW alongside manual GLOW so user sees the cost of their choice (spec §6.3).

Movable to M8 if Phase 1 timeline slips.

---

### M7 — Phase 1 UX acceptance & ship

- **Work:**
  - Playwright test: "empty canvas → green verdict for 2-stage kerolox/hydrolox, 3,500 kg comsat, LEO in under 2 minutes" (§9 UX acceptance) with a wall-clock assertion.
  - Manual axe-core accessibility pass: zero AA violations.
  - Model-simplifications callout (spec closing paragraph) rendered as About modal.
  - Branding wired in: `Wordmark`, `Footer` with `© 2026 BlueDrop, LLC` and `PRODUCT_VERSION`.
  - Telemetry (§11 opt-in): `stageInserted`, `solveFailed{ruleId}`, `verdictReached{color}` with explicit opt-in dialog.
- **Exit:** Phase 1 shippable. Tag `v0.1.0-phase1`.

---

### M8 — Phase 1.1 stretch bundle (optional; does not block M9)

Deliver whichever land in the window; drop the rest with no downstream impact.

- **M8.a — Strap-on boosters (§3.2):** `packages/engine/src/boosters.ts` — parallel-staging model (combined effective Isp weighted by mass flow, Stage-0 burnout as separation event). UI: lateral drop zones next to Stage 1 accepting only solid modules; counts 0/2/4. Test against a hand-computed Delta-II-like reference.
- **M8.b — Comparison tray (§7.3):** "Pin" button on results; localStorage-backed list up to 3. `ComparisonTray.tsx` side-by-side table of GLOW, payload fraction, cost (cost column appears once M9 landed).
- **M8.c — Manual Δv allocation** if not delivered in M6.

---

### M9 — Phase 2 cost model (§10.1)

- **Entry:** Phase 1 shipped.
- **Files:** [packages/suggestions/src/economics.ts](packages/suggestions/src/economics.ts), [packages/web/src/economics/CostBreakdown.tsx](packages/web/src/economics/CostBreakdown.tsx), [packages/web/src/economics/AssumptionsDrawer.tsx](packages/web/src/economics/AssumptionsDrawer.tsx), [packages/web/src/economics/ReuseToggle.tsx](packages/web/src/economics/ReuseToggle.tsx).
- **Work:**
  - `estimateCost(design, solve, assumptions): CostBreakdown` — propellant cost, hardware cost, ops multiplier, cost/flight, cost/kg to orbit, ops complexity 1–10.
  - `AssumptionsDrawer`: editable table of illustrative 2020s values from §10.1 with rough-figures disclaimer. Changes re-compute live.
  - `ReuseToggle`: −30% Stage-1 performance as Δv tax, amortize Stage-1 hardware over user-set flight count, show expendable-vs-reusable cost/kg side-by-side.
- **Exit:** cost breakdown matches hand computation on kerolox/hydrolox reference.

---

### M10 — Suggestions engine (§10.2)

- **Files:** [packages/suggestions/src/rules/](packages/suggestions/src/rules/), [packages/suggestions/src/counterfactual.ts](packages/suggestions/src/counterfactual.ts), [packages/suggestions/src/index.ts](packages/suggestions/src/index.ts), [packages/web/src/economics/SuggestionsPanel.tsx](packages/web/src/economics/SuggestionsPanel.tsx).
- **Work:**
  - `counterfactual.ts`: given a base design and mutation function, run `solve()` and `estimateCost()` on the mutant; return delta metrics.
  - One file per rule S-1…S-7 (spec §10.2 table). Each exports `evaluate(design, solve, cost): Suggestion | null` and, when firing, provides the counterfactual mutation. Impact numbers are computed, not canned (§10.2 explicit).
  - `SuggestionsPanel` renders cards ranked by impact; each has **Apply** to invoke the mutation via the store.
- **Performance callout (spec risk):** 7 rules × 100 ms/solve = up to 700 ms worst case per design change.
  - Memoize per `(design-hash, rule-id)`.
  - Run only when Economics tab visible.
  - Escalate to Web Worker only if p95 > 500 ms.
- **Exit:** kerolox/hydrolox triggers S-1 with computed common-methalox counterfactual (§10.4 test 1); one unit test per rule showing trigger and non-trigger.

---

### M11 — LLM advisor via Together.ai proxy (§10.3, adapted)

Spec §10.3 assumed Anthropic; PropelX uses **Together.ai** (per `.env` `TOGETHER_AI_API_KEY`). Design unchanged; provider swapped.

- **Files:** [packages/proxy/src/index.ts](packages/proxy/src/index.ts), [packages/proxy/src/together.ts](packages/proxy/src/together.ts), [packages/proxy/src/prompt.ts](packages/proxy/src/prompt.ts), [packages/proxy/src/cache.ts](packages/proxy/src/cache.ts), [packages/web/src/economics/AdvisorNarrative.tsx](packages/web/src/economics/AdvisorNarrative.tsx).
- **Work:**
  - Proxy accepts `POST /advise` with `{ design, solve, suggestions }`. Validates schema; forwards to `https://api.together.xyz/v1/chat/completions` with a constrained prompt (spec §10.3: LLM narrates, never calculates).
  - Model config via env: `TOGETHER_MODEL` (default: `meta-llama/Llama-3.3-70B-Instruct-Turbo`; make swappable).
  - `TOGETHER_AI_API_KEY` read server-side only; never crosses the wire to the browser. Reject requests missing valid origin; add per-IP rate limit.
  - Cache in KV keyed by SHA-256 of `{ design, solve, suggestions, model }` — same input ⇒ same narrative, cheap.
  - Client action: "Explain this design like an aerospace consultant" button in Economics tab; loading state; renders returned markdown.
  - **Numeric safety post-check:** flag responses where the LLM introduced numeric tokens not present in the input payload; render narrative with a "narrative only — figures from engine" label.
- **Exit:** narrative renders end-to-end; Together.ai key never appears in the client bundle (verified via `curl` on built JS); cache hit rate observable in proxy logs.

---

### M12 — Phase 2 acceptance & ship

- **Work:**
  - Run §10.4 tests: (1) S-1 firing on kerolox/hydrolox with methalox counterfactual; (2) reuse-toggle break-even flight count; (3) every "Apply" produces the exact advertised numbers; (4) assumption edits re-rank suggestions live.
  - Playwright: user opens Economics tab, applies S-2, verdict updates.
- **Exit:** Phase 2 shippable. Tag `v0.2.0-phase2`.

---

## 5. Cross-cutting concerns

### 5.1 Accessibility (WCAG 2.1 AA)

- Keyboard equivalents for every drag/drop action (§5.2). Owned by M4.4.
- ARIA live region announces solve verdict changes so screen readers hear "Reaches orbit" without visual cue.
- Contrast on verdict palette must exceed 4.5:1 for banner text. Verify PropelX accent `#6AA94F` against white text — may need a slightly darker shade for text-on-green surfaces; keep the bright accent for the wordmark and use a darker variant (e.g., `#4E8F3A`) for banner text backgrounds. Enforce via axe-core in CI.
- Focus visible on all interactive elements; skip-link at top of `App.tsx`.
- Charts include text data tables as fallback (Recharts `<title>`/`<desc>`).

### 5.2 Performance targets

- Full solve p99 < 100 ms (§6.6): enforced by M1.6 perf test.
- Live re-solve debounced 300 ms (§5.2).
- LCP < 2.5 s on mid-range laptop over cable: M4 budget.
- Bundle: `@propelx/web` under 300 kB gzipped excluding charts. Recharts ~90 kB is acceptable given its role.
- Phase 2 counterfactual budget: p95 suggestions refresh < 500 ms. See M10 mitigation.

### 5.3 Determinism

- Engine forbids `Math.random`, `Date.now`, network I/O, DOM access. Enforce via ESLint `no-restricted-globals`.
- §9.8 (100 identical runs deep-equal) is the smoke check.
- Nelder–Mead uses fixed initial simplex from Ve-proportional guess (no randomness).

### 5.4 Testing strategy

| Layer | Framework | Location | Coverage target |
|---|---|---|---|
| Engine unit | Vitest | `packages/engine/test/` | 100% branches on sizing/validation/allocator |
| Engine acceptance | Vitest | `packages/engine/test/acceptance.test.ts` | §9 tests 1–8 |
| Suggestions unit | Vitest | `packages/suggestions/test/` | one test per rule S-1…S-7 |
| Web components | Vitest + Testing Library | `packages/web/test/` | key components; snapshot verdicts |
| Web E2E | Playwright | `packages/web/e2e/` | §9 UX 2-minute test; keyboard-only build; §10.4 flows |
| Perf | Vitest benchmark | `packages/engine/test/perf.bench.ts` | p99 solve latency |
| A11y | axe-core in Playwright | `packages/web/e2e/a11y.spec.ts` | zero AA violations on main flows |

### 5.5 Telemetry (§11, opt-in)

- Explicit opt-in dialog first load; default off.
- Events: `stageInserted{moduleId, position}`, `solveFailed{ruleId}`, `verdictReached{color, missionDest}`, `suggestionApplied{ruleId}`.
- No PII. Post to proxy (M11) forwarding to analytics sink (choose at M11). Consent stored in localStorage.

---

## 6. Spec §12 open questions — recommendations

| # | Question | Recommendation |
|---|---|---|
| 1 | Strap-on boosters in Phase 1 or 1.1? | **1.1 (M8).** Parallel-staging complicates the solver; ship the base engine first. |
| 2 | Structural-fraction slider ("technology level")? | **Defer past Phase 2.** Not required for either shippable milestone. |
| 3 | In-space mission mode (LEO → GTO transfer stage sizing)? | **Resolve early with schema headroom.** Add `mission.type: "launch" | "in-space"` union at M1.1 even if implementation is deferred — the migration cost later is far higher. |
| 4 | Gamification / challenges? | **Defer.** Phase 2.1 or beyond. |
| 5 | Unit toggle (metric vs. imperial)? | **Defer, but scaffold.** Route all formatting through `lib/format.ts` (M2) so a units context can be added later without touching every component. |

---

## 7. Risk register

| Risk | Where it bites | Mitigation |
|---|---|---|
| **Auto-allocator feasibility discontinuities (§6.3)** | Optimizer stuck at V-5 boundary. | Nelder–Mead (M1.3); infeasibility → `+∞` GLOW; equal-split fallback with warning. |
| **Solve → render → layout coupling (§5.1)** | Re-render loops from sprite heights. | Single `<AssemblyCanvas>` reads `useSolveResult()` once, passes down; sprites never re-solve; CSS transitions preserve layout on invalid flips. |
| **Phase 2 counterfactual perf budget** | 7 rules × solves compound cost. | Memoize per `(design-hash, rule-id)`; run only when tab visible; Web Worker only if p95 > 500 ms. |
| **LLM introduces uncomputed numbers (§10.3)** | Users trust numeric claims. | Constrained prompt + numeric-token post-check (M11); "figures from engine" label. |
| **Together.ai API key leakage** | Key in client bundle → billing/abuse risk. | Key lives only in proxy env; ESLint rule forbids `VITE_TOGETHER*`; CI check on built JS. |
| **Bisection edge cases at payload bounds (§4.2)** | 1 kg or 200,000 kg is the true limit. | Bisection returns `null` if upper bound closes (unbounded) and `0` if lower doesn't (unfeasible at any payload); UI distinguishes both. |
| **Solid-booster parallel-staging math (§3.2)** | Effective-Isp weighting easy to get wrong. | `boosters.ts` behind a feature flag at M8; hand-computed reference test. |

---

## 8. Milestone → acceptance-test map

| Milestone | §9 tests | §10.4 tests |
|---|---|---|
| M1 | 1, 2, 3, 4, 5, 6, 7, 8 | — |
| M7 | UX 2-minute test | — |
| M9 | — | 4 (partial — assumption editing live) |
| M10 | — | 1, 3 |
| M12 | — | 2, 3, 4 |

---

## 9. Suggested cadence

Rough estimate for a single experienced engineer:

- M0: 0.5 day
- M1: 5–7 days
- M2: 1 day
- M3: 1 day
- M4: 3–4 days
- M5: 2 days
- M6: 1 day (or fold into M8)
- M7: 1–2 days
- **Phase 1 total: ~15–19 days**
- M8: 2–3 days (optional)
- M9: 2 days
- M10: 3 days
- M11: 2 days
- M12: 1 day
- **Phase 2 total: ~8–11 days**

---

*Model simplifications are intentional and stated in-app (spec closing paragraph): fixed loss budgets instead of trajectory integration, single-number structural fractions, engine mass folded into ε, and no fairing/interstage line items. The tool teaches staging physics honestly at the cost of ~±10–15% fidelity against real vehicles.*

*© 2026 BlueDrop, LLC. All rights reserved.*
