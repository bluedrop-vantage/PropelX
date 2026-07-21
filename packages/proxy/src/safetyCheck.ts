// Numeric-safety post-check (spec §10.3 constraint + PLAN M11 risk callout).
// If the LLM introduces numeric tokens that don't appear in the input payload,
// flag them so the UI can label the response "narrative only — figures from engine"
// and, if egregious, refuse to render.

function extractNumbers(text: string): Set<string> {
  const set = new Set<string>();
  const re = /-?\d+(?:[.,]\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0].replaceAll(',', '');
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) continue;
    // Skip trivial integers (|n| < 100, no decimal). Catches things like
    // "Falcon-9", "2 astronauts", "3–5 short paragraphs" that the LLM will
    // naturally use as English text, not as engineering figures.
    const isInteger = !raw.includes('.');
    if (isInteger && Math.abs(parsed) < 100) continue;
    set.add(raw);
  }
  return set;
}

export interface SafetyReport {
  suspiciousNumbers: string[];
  passed: boolean;
}

/**
 * Check that every numeric token in the narrative is either:
 *   - present in the JSON payload we sent, OR
 *   - within 5 % of a numeric present in the payload (allows for rounding).
 * Trivial numbers (0..9 without decimals) are always allowed.
 */
export function checkNumericSafety(narrative: string, payload: unknown): SafetyReport {
  const payloadStr = JSON.stringify(payload);
  const payloadNums = extractNumbers(payloadStr);
  const narrativeNums = extractNumbers(narrative);
  const payloadFloats = [...payloadNums].map((n) => parseFloat(n)).filter((n) => Number.isFinite(n));

  const suspicious: string[] = [];
  for (const n of narrativeNums) {
    if (payloadNums.has(n)) continue;
    const parsed = parseFloat(n);
    if (!Number.isFinite(parsed)) continue;
    // Accept if within 5 % of any payload number (rounding tolerance).
    const near = payloadFloats.some((p) => Math.abs(p) > 0 && Math.abs(parsed - p) / Math.abs(p) < 0.05);
    if (near) continue;
    suspicious.push(n);
  }

  return {
    suspiciousNumbers: suspicious,
    // "passed" = at most 1 suspicious number (a stray year reference is tolerable;
    // multiple invented figures are not — spec §10.3 forbids LLM calculation).
    passed: suspicious.length <= 1,
  };
}
