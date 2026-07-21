// axe-core sweep across PropelX's main states. Fails the CI job on any
// serious or critical accessibility violation (WCAG 2.1 AA per spec §5.2).

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function fresh(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });
  await page.reload();
}

async function serious(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
}

test.describe('axe-core sweep (WCAG 2.1 AA)', () => {
  test('empty canvas has no serious violations', async ({ page }) => {
    await fresh(page);
    expect(await serious(page)).toEqual([]);
  });

  test('2-stage kerolox/hydrolox loaded stack has no serious violations', async ({ page }) => {
    await fresh(page);
    await page
      .getByRole('button', { name: /insert kerosene \/ lox at top of stack/i })
      .click();
    await page
      .getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i })
      .click();
    await expect(page.locator('.verdict-banner.green')).toBeVisible();
    expect(await serious(page)).toEqual([]);
  });

  test('economics tab open has no serious violations', async ({ page }) => {
    await fresh(page);
    await page
      .getByRole('button', { name: /insert kerosene \/ lox at top of stack/i })
      .click();
    await page
      .getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i })
      .click();
    await page.getByRole('tab', { name: /economics/i }).click();
    await expect(page.locator('.cost-breakdown')).toBeVisible();
    expect(await serious(page)).toEqual([]);
  });

  test('stage detail drawer open has no serious violations', async ({ page }) => {
    await fresh(page);
    await page
      .getByRole('button', { name: /insert kerosene \/ lox at top of stack/i })
      .click();
    await page
      .getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i })
      .click();
    await page.getByRole('button', { name: /details for stage 2/i }).click();
    await expect(page.locator('.stage-drawer')).toBeVisible();
    expect(await serious(page)).toEqual([]);
  });

  test('About modal open has no serious violations', async ({ page }) => {
    await fresh(page);
    await page.getByRole('button', { name: /^about$/i }).click();
    await expect(page.getByRole('dialog', { name: /about/i })).toBeVisible();
    expect(await serious(page)).toEqual([]);
  });
});
