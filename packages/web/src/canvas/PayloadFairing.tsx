import { formatMass } from '../lib/format.js';

/**
 * Payload fairing rendered as an SVG ogive nose cone with a short cylindrical
 * skirt. Ogive curve is a quadratic Bezier from the tip down each side — a
 * closer visual match to real fairings (Falcon 9, Atlas V, Ariane 5) than the
 * old triangle.
 */
export function PayloadFairing({ payloadKg }: { payloadKg: number }) {
  return (
    <div className="payload-fairing" aria-label={`payload ${formatMass(payloadKg)}`}>
      <svg
        className="fairing-svg"
        viewBox="0 0 40 60"
        width="40"
        height="60"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="fairing-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9CA3AF" />
            <stop offset="50%" stopColor="#F3F4F6" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>
        </defs>
        {/* Ogive nose (top) into a straight cylinder (bottom). */}
        <path
          d="M 20 1
             Q 38 20 38 42
             L 38 58
             L 2 58
             L 2 42
             Q 2 20 20 1 Z"
          fill="url(#fairing-grad)"
          stroke="#4B5563"
          strokeWidth="0.6"
        />
        {/* Payload separation line just above the interstage. */}
        <line x1="2" y1="52" x2="38" y2="52" stroke="#4B5563" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
      </svg>
      <div className="label">Payload · {formatMass(payloadKg)}</div>
    </div>
  );
}
