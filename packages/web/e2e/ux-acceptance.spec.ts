// Spec §9 UX acceptance:
//   "A first-time user can go from empty canvas to a green verdict
//    (2-stage kerolox/hydrolox, 3,500 kg comsat, LEO) in under 2 minutes
//    without documentation."
//
// This test performs the flow via visible controls (nothing exotic) and
// asserts the wall-clock budget on the entire journey.

import { test, expect } from '@playwright/test';

test.describe('§9 UX acceptance', () => {
  test('empty canvas → green REACHES ORBIT verdict in under 2 minutes', async ({ page }) => {
    const t0 = Date.now();

    await page.goto('/');
    // Clear any URL-restored design so we start from a truly empty stack.
    await page.evaluate(() => {
      window.localStorage.clear();
      window.location.hash = '';
    });
    await page.reload();

    // Sanity: header is present.
    await expect(page.getByRole('button', { name: /about/i })).toBeVisible();

    // 1) Destination — LEO is the default.
    await expect(page.locator('#destination-select')).toHaveValue('LEO');

    // 2) Payload — click the Comms satellite preset (3,500 kg).
    await page.getByRole('button', { name: /comms satellite/i }).click();
    await expect(page.locator('#payload-kg')).toHaveValue('3500');

    // 3) Insert Stage 1 — Kerosene / LOX.
    await page
      .getByRole('button', { name: /insert kerosene \/ lox at top of stack/i })
      .click();

    // 4) Insert Stage 2 — Hydrogen / LOX.
    await page
      .getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i })
      .click();

    // 5) Verify the verdict banner is green with "REACHES ORBIT".
    const banner = page.locator('.verdict-banner');
    await expect(banner).toHaveClass(/green/, { timeout: 5_000 });
    await expect(banner).toContainText('REACHES ORBIT');

    // 6) Wall-clock budget.
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(120_000);
  });

  test('empty canvas shows the guiding empty-state hint', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.location.hash = '';
    });
    await page.reload();
    // Empty-hint text is inside a <p> containing an <em>; use a stable class
    // selector and match on the "drag a module" substring.
    await expect(page.locator('.empty-hint')).toBeVisible();
    await expect(page.locator('.empty-hint')).toContainText(/drag a module/i);
  });

  test('single kerolox stage fails with V-5 (spec §9 test 1)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.location.hash = '';
    });
    await page.reload();
    await page
      .getByRole('button', { name: /insert kerosene \/ lox at top of stack/i })
      .click();
    // Red banner. Kerolox at 9,400 m/s hits the allocator's single-stage
    // infeasibility path; the message says "Single stage cannot deliver…".
    const banner = page.locator('.verdict-banner');
    await expect(banner).toHaveClass(/red/, { timeout: 5_000 });
    await expect(banner).toContainText(/single stage cannot deliver/i);
  });
});
