// Electro-magnetic launch-assist add-on end-to-end.
// Confirms the UI wires enable → recompute → reduced GLOW in the results.

import { test, expect } from '@playwright/test';

async function fresh(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });
  await page.reload();
}

async function buildBaseline(page: import('@playwright/test').Page): Promise<number> {
  await page.getByRole('button', { name: /comms satellite/i }).click();
  await page.getByRole('button', { name: /insert kerosene \/ lox at top of stack/i }).click();
  await page.getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i }).click();
  await expect(page.locator('.verdict-banner')).toHaveClass(/green/);
  // Read GLOW value from the KeyFigures block.
  const glowText = await page.locator('.key-figures div').first().locator('dd').innerText();
  const kg = parsemass(glowText);
  return kg;
}

function parsemass(s: string): number {
  // "498.3 t" → 498_300 kg; "12,345 lb" → 12_345 * 0.4536; falls back to NaN.
  const m = s.match(/([\d,\.]+)\s*(t|kg|lb|short ton)/i);
  if (!m) return NaN;
  const raw = parseFloat(m[1]!.replaceAll(',', ''));
  const unit = m[2]!.toLowerCase();
  if (unit === 't') return raw * 1_000;
  if (unit === 'kg') return raw;
  if (unit === 'lb') return raw / 2.2046226;
  if (unit === 'short ton') return raw * 907.185;
  return NaN;
}

test.describe('Launch-assist add-on', () => {
  test('enabling the assist reduces GLOW at the same mission target', async ({ page }) => {
    await fresh(page);
    const baselineGlow = await buildBaseline(page);
    expect(Number.isFinite(baselineGlow)).toBe(true);

    // Enable the launch assist.
    await page.getByRole('checkbox', { name: /launch assist/i }).check();
    // Panel should expand with sliders visible.
    await expect(page.locator('.launch-assist-panel .assist-body')).toBeVisible();

    // Solve should still be green.
    await expect(page.locator('.verdict-banner')).toHaveClass(/green/);
    // GLOW after enabling assist.
    const assistedGlow = await page
      .locator('.key-figures div')
      .first()
      .locator('dd')
      .innerText()
      .then(parsemass);
    expect(assistedGlow).toBeLessThan(baselineGlow);
    // Δv split row is visible.
    await expect(page.locator('.key-figures .full-row')).toBeVisible();
    await expect(page.locator('.key-figures .full-row')).toContainText(/rocket/);
  });

  test('crewed mission + 5g peak accel triggers a red V-9 verdict', async ({ page }) => {
    await fresh(page);
    // Human-rated preset.
    await page.getByRole('button', { name: /crew \(2 astronauts\)/i }).click();
    await page.getByRole('button', { name: /insert kerosene \/ lox at top of stack/i }).click();
    await page.getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i }).click();
    // Enable assist.
    await page.getByRole('checkbox', { name: /launch assist/i }).check();
    // Push peak acceleration to 5g via the slider.
    const accel = page.locator('.assist-body label', { hasText: 'Peak acceleration' }).locator('input[type="range"]');
    await accel.evaluate((el) => {
      const input = el as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, '5');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // The design should now flag a V-9 hard fail.
    await expect(page.locator('.verdict-banner')).toHaveClass(/red/, { timeout: 5_000 });
    await expect(page.locator('.violation-list')).toContainText(/Crewed launch:.*4g/);
  });
});
