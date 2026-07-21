// Parse the WL_PRODUCT env string into a wordmark + accent palette.
// Format: "PropelX|scheme: {Propel|#FFFFFF}{X|#6AA94FFF}"

export interface WordmarkPart {
  text: string;
  color: string;
}

export interface Branding {
  productName: string;
  wordmark: WordmarkPart[];
  accent: string; // primary accent (used for success verdict green)
  accentDark: string; // darker variant for text-on-accent contrast
  whitelabel: string;
  productVersion: string;
  copyrightLine: string;
}

const DEFAULT_ACCENT = '#6AA94F';

function normalizeHex(hex: string): string {
  // Strip a trailing FF alpha if present so we get a clean CSS hex.
  if (/^#[0-9A-Fa-f]{8}$/.test(hex) && hex.slice(-2).toUpperCase() === 'FF') {
    return hex.slice(0, 7);
  }
  return hex;
}

export function parseWordmark(raw: string): { name: string; parts: WordmarkPart[] } {
  // "PropelX|scheme: {Propel|#FFFFFF}{X|#6AA94FFF}"
  const [nameRaw, schemeRaw] = raw.split(/\|scheme:\s*/);
  const name = (nameRaw ?? 'PropelX').trim();
  const parts: WordmarkPart[] = [];
  if (schemeRaw) {
    const re = /\{([^|}]+)\|([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(schemeRaw)) !== null) {
      parts.push({ text: m[1]!, color: normalizeHex(m[2]!) });
    }
  }
  if (parts.length === 0) {
    parts.push({ text: name, color: '#FFFFFF' });
  }
  return { name, parts };
}

function darken(hex: string, amount = 0.2): string {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase()}`;
}

export function loadBranding(): Branding {
  const wlProduct = import.meta.env.VITE_WL_PRODUCT ?? 'PropelX|scheme: {Propel|#FFFFFF}{X|#6AA94FFF}';
  const whitelabel = import.meta.env.VITE_WHITELABEL ?? 'BlueDrop, LLC';
  const productVersion = import.meta.env.VITE_PRODUCT_VERSION ?? '';
  const { name, parts } = parseWordmark(wlProduct);
  // Accent is derived from the "X" part (non-white) if we can find one.
  const nonWhite = parts.find((p) => p.color.toUpperCase() !== '#FFFFFF');
  const accent = nonWhite?.color ?? DEFAULT_ACCENT;
  const year = new Date().getFullYear();
  return {
    productName: name,
    wordmark: parts,
    accent,
    // 0.4 keeps white text at ~5.8:1 contrast (WCAG AA requires 4.5:1 for
    // normal text). Used as the verdict-banner "REACHES ORBIT" background.
    accentDark: darken(accent, 0.4),
    whitelabel,
    productVersion,
    copyrightLine: `© ${year} ${whitelabel}. All rights reserved.`,
  };
}
