// Constrained prompt for the Together.ai advisor.
//
// Rule enforced verbatim from spec §10.3: the LLM narrates, never calculates.
// All numeric claims in the response must come from the payload we send it.
// The proxy runs a post-check (see server.ts) to flag responses that introduce
// numeric tokens absent from the input.

import type { DesignDoc, SolveResult } from '@propelx/engine';
import type { CostBreakdown, Suggestion } from '@propelx/suggestions';

export interface AdviseRequest {
  design: DesignDoc;
  solve: SolveResult;
  cost: CostBreakdown;
  suggestions: Suggestion[];
}

export const SYSTEM_PROMPT = `You are an aerospace consultant summarising an educational rocket-design report.

STRICT RULES — non-negotiable:
1. NEVER calculate. Every number you cite must appear verbatim in the JSON payload the user sends.
2. NEVER invent vehicle names, program names, or figures. Historical analogies are welcome ("Falcon 9 class", "Saturn V pattern") when the payload's numbers plausibly match.
3. Write for a curious student: 3–5 short paragraphs, plain prose, no bullet-lists unless the user asks. No emojis.
4. Cover: (a) what the design achieves, (b) what the suggestions engine flagged, (c) prioritised next steps.
5. Do NOT ask questions back. Deliver the assessment.

The user's next message is a JSON payload. Read it, do NOT echo it back, and produce your narrative.`;

export function userMessageFor(req: AdviseRequest): string {
  return JSON.stringify(req);
}
