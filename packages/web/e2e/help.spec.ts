// Coverage for the in-app help affordances:
//   - Per-section HelpTip disclosure buttons
//   - Page-level HowToUse modal accessible from the header

import { test, expect } from '@playwright/test';

async function fresh(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });
  await page.reload();
}

test.describe('help affordances', () => {
  test('every major panel exposes a "?" HelpTip', async ({ page }) => {
    await fresh(page);
    // Pantry, Mission, Vehicle stack, Results all have HelpTips at panel level.
    await expect(page.getByRole('button', { name: /help: pantry/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /help: mission/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /help: vehicle stack/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /help: results/i })).toBeVisible();
  });

  test('clicking a HelpTip opens a labelled disclosure region', async ({ page }) => {
    await fresh(page);
    const trigger = page.getByRole('button', { name: /help: mission/i });
    await trigger.click();
    // Popover appears with role="region" and a matching aria-label.
    const popover = page.getByRole('region', { name: /help: mission/i });
    await expect(popover).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // Escape closes it and returns focus to the trigger.
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('clicking outside a HelpTip closes it', async ({ page }) => {
    await fresh(page);
    await page.getByRole('button', { name: /help: pantry/i }).click();
    await expect(page.getByRole('region', { name: /help: pantry/i })).toBeVisible();
    // Click somewhere else in the app (header).
    await page.locator('.app-header').click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole('region', { name: /help: pantry/i })).toBeHidden();
  });

  test('How-to-use button in the header opens the walkthrough modal', async ({ page }) => {
    await fresh(page);
    await page.getByRole('button', { name: /^how to use$/i }).click();
    const dialog = page.getByRole('dialog', { name: /how to use/i });
    await expect(dialog).toBeVisible();
    // Contains the numbered walkthrough sections.
    await expect(dialog).toContainText(/set the mission/i);
    await expect(dialog).toContainText(/build the stack/i);
    await expect(dialog).toContainText(/read the verdict/i);
    // Escape closes the modal.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('help affordances have no serious axe-core violations', async ({ page }) => {
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    await fresh(page);
    // Open a HelpTip and the HowToUse modal simultaneously to sweep both.
    await page.getByRole('button', { name: /help: mission/i }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious).toEqual([]);
  });
});
