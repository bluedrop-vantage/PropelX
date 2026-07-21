import { describe, it, expect } from 'vitest';
import { checkNumericSafety } from '../src/safetyCheck.js';

describe('checkNumericSafety', () => {
  it('accepts a narrative that only cites payload numbers', () => {
    const payload = { glow_kg: 498300, payload_fraction: 0.0191 };
    const narrative =
      'The vehicle masses about 498300 kg at liftoff with a payload fraction near 0.0191 — a Falcon-9-class figure.';
    const report = checkNumericSafety(narrative, payload);
    expect(report.passed).toBe(true);
    expect(report.suspiciousNumbers).toEqual([]);
  });

  it('accepts numbers within 5 % of any payload number (rounding tolerance)', () => {
    const payload = { costPerKgOrbitUsd: 3800 };
    const narrative = 'Cost per kg to orbit lands around $3,750 in this design.';
    const report = checkNumericSafety(narrative, payload);
    expect(report.passed).toBe(true);
  });

  it('flags LLM-invented numbers far from any payload figure', () => {
    const payload = { glow_kg: 498300 };
    const narrative = 'It also outperforms 12345 tonnes of ceramics and hits 67890 mm of steel.';
    const report = checkNumericSafety(narrative, payload);
    expect(report.suspiciousNumbers.length).toBeGreaterThan(0);
    expect(report.passed).toBe(false);
  });
});
