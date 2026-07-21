import { describe, it, expect } from 'vitest';
import { parseWordmark } from '../src/branding/theme.js';

describe('parseWordmark', () => {
  it('parses the PropelX WL_PRODUCT scheme', () => {
    const { name, parts } = parseWordmark('PropelX|scheme: {Propel|#FFFFFF}{X|#6AA94FFF}');
    expect(name).toBe('PropelX');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toEqual({ text: 'Propel', color: '#FFFFFF' });
    // 8-hex with trailing FF should collapse to 6-hex for CSS.
    expect(parts[1]).toEqual({ text: 'X', color: '#6AA94F' });
  });

  it('falls back to a single-white part when no scheme is provided', () => {
    const { name, parts } = parseWordmark('PropelX');
    expect(name).toBe('PropelX');
    expect(parts).toEqual([{ text: 'PropelX', color: '#FFFFFF' }]);
  });
});
