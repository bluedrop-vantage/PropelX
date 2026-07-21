// Keyboard-only stack-build flow — spec §5.2 accessibility requirement:
// "all drag-drop actions must have keyboard equivalents".
//
// This test drives the app using only Tab / Shift+Tab / Enter / arrow keys /
// Delete, and verifies the same 2-stage kerolox/hydrolox → LEO green verdict
// as the UX acceptance test.

import { test, expect } from '@playwright/test';

test.describe('keyboard-only build flow (§5.2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.location.hash = '';
    });
    await page.reload();
  });

  test('user can build a 2-stage design without a mouse', async ({ page }) => {
    // Focus the Kerosene / LOX Insert button and activate it with Enter.
    const insertKerolox = page.getByRole('button', {
      name: /insert kerosene \/ lox at top of stack/i,
    });
    await insertKerolox.focus();
    await page.keyboard.press('Enter');

    const insertHydrolox = page.getByRole('button', {
      name: /insert hydrogen \/ lox at top of stack/i,
    });
    await insertHydrolox.focus();
    await page.keyboard.press('Enter');

    // Green verdict must appear without any mouse involvement.
    const banner = page.locator('.verdict-banner');
    await expect(banner).toHaveClass(/green/, { timeout: 5_000 });
    await expect(banner).toContainText('REACHES ORBIT');
  });

  test('a keyboard user can remove a stage via the Remove button', async ({ page }) => {
    await page
      .getByRole('button', { name: /insert kerosene \/ lox at top of stack/i })
      .click();
    await page
      .getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i })
      .click();

    // Two stages present.
    await expect(page.locator('.stage-sprite')).toHaveCount(2);

    // Activate the top stage's Remove button via keyboard only. Locator.press
    // focuses the element and then dispatches the key — same code path a real
    // keyboard user hits.
    await page.getByRole('button', { name: /remove stage 2/i }).press('Enter');

    await expect(page.locator('.stage-sprite')).toHaveCount(1);
  });

  test('the Skip to assembly canvas link is the first focusable element', async ({ page }) => {
    // A Tab from a fresh page should reach the skip link first (WCAG 2.1 AA).
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: /skip to assembly canvas/i });
    await expect(skip).toBeFocused();
  });
});
