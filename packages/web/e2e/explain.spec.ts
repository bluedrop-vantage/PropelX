// Explain modal — verifies the button surfaces the step-by-step math for
// the current design (Tsiolkovsky primitives, Δv allocation, per-stage
// sizing).

import { test, expect } from '@playwright/test';

async function fresh(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });
  await page.reload();
}

test.describe('Explain modal', () => {
  test('button is disabled on an empty canvas', async ({ page }) => {
    await fresh(page);
    await expect(page.getByRole('button', { name: /Explain how this design was computed/i })).toBeDisabled();
  });

  test('opens a dialog with equations for the current stack', async ({ page }) => {
    await fresh(page);
    await page.getByRole('button', { name: /insert kerosene \/ lox at top of stack/i }).click();
    await page.getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i }).click();

    const explain = page.getByRole('button', { name: /Explain how this design was computed/i });
    await expect(explain).toBeEnabled();
    await explain.click();

    const dialog = page.getByRole('dialog', { name: /how this design was computed/i });
    await expect(dialog).toBeVisible();
    // Includes the mission block.
    await expect(dialog).toContainText(/Mission/);
    await expect(dialog).toContainText(/9,?400 m\/s/);
    // Includes the Tsiolkovsky primitives.
    await expect(dialog).toContainText(/Ve = Isp · g₀/);
    await expect(dialog).toContainText(/R = exp\(Δv \/ Ve\)/);
    await expect(dialog).toContainText(/mp = \(R−1\) · m_above \/ denominator/);
    // Verdict section.
    await expect(dialog).toContainText(/Verdict/);
    // Escape closes.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('shows the launch-assist Δv gift when the add-on is enabled', async ({ page }) => {
    await fresh(page);
    await page.getByRole('button', { name: /comms satellite/i }).click();
    await page.getByRole('button', { name: /insert kerosene \/ lox at top of stack/i }).click();
    await page.getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i }).click();
    // Enable launch assist.
    await page.getByRole('checkbox', { name: /launch assist/i }).check();
    // Open the explain modal.
    await page.getByRole('button', { name: /Explain how this design was computed/i }).click();
    const dialog = page.getByRole('dialog', { name: /how this design was computed/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Launch assist Δv gift/);
    await expect(dialog).toContainText(/Effective rocket Δv/);
  });
});
