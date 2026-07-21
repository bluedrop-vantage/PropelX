// End-to-end coverage for the PLAN §6 open-question features:
//   Q2 tech-level slider (structural fraction override)
//   Q3 in-space mission mode
//   Q4 gamification challenges
//   Q5 metric ↔ imperial units toggle

import { test, expect } from '@playwright/test';

async function fresh(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });
  await page.reload();
}

test.describe('Q5 units toggle', () => {
  test('metric ↔ imperial swaps the payload unit label', async ({ page }) => {
    await fresh(page);
    // Default metric preset text should include a "kg" pill on the button.
    const commSat = page.getByRole('button', { name: /comms satellite/i });
    await expect(commSat).toContainText(/3,?500 kg/);
    // Flip to imperial.
    await page.getByRole('button', { name: /show values in imperial/i }).click();
    await expect(commSat).toContainText(/3,?500 kg/); // preset button labels are metric-only
    // Insert kerolox + hydrolox to get a solved verdict, then check the banner
    // uses "lb" or "short ton" once the solve produces mass output.
    await page.getByRole('button', { name: /insert kerosene \/ lox at top of stack/i }).click();
    await page.getByRole('button', { name: /insert hydrogen \/ lox at top of stack/i }).click();
    const banner = page.locator('.verdict-banner');
    await expect(banner).toHaveClass(/green/, { timeout: 5_000 });
    await expect(banner).toContainText(/lb|short ton/);
  });
});

test.describe('Q3 in-space mission mode', () => {
  test('switching to in-space swaps the destination list', async ({ page }) => {
    await fresh(page);
    // Launch defaults include "Low Earth orbit".
    await expect(page.locator('#destination-select')).toHaveValue('LEO');
    // Toggle in-space.
    // Exact match: the HelpTip button's aria-label "Help: Launch vs In-space"
    // would otherwise also match a fuzzy "In-space" query.
    await page.getByRole('button', { name: 'In-space', exact: true }).click();
    // Destination should have snapped to LEO_TO_GTO.
    await expect(page.locator('#destination-select')).toHaveValue('LEO_TO_GTO');
    // Ion first stage is legal in space — no V-3 violation.
    await page.getByRole('button', { name: /insert ion \/ electric at top of stack/i }).click();
    // In-space + ion should NOT produce a red V-3 verdict.
    await expect(page.locator('.verdict-banner')).not.toContainText(/millinewton/i);
  });
});

test.describe('Q4 challenges', () => {
  test('starting a challenge locks the mission and shows criteria', async ({ page }) => {
    await fresh(page);
    // Switch to the Challenges tab.
    await page.getByRole('tab', { name: /challenges/i }).click();
    // Start the "Comsat to GTO" challenge.
    const comsatCard = page
      .locator('.challenge-card', { hasText: /Comsat to GTO/i });
    await comsatCard.getByRole('button', { name: /^Start$/ }).click();
    // The button flips to "End challenge".
    await expect(
      comsatCard.getByRole('button', { name: /End challenge/i }),
    ).toBeVisible();
    // Criteria list is populated.
    await expect(comsatCard.locator('.criteria li').first()).toBeVisible();
    // Switch back to Physics tab; the banner should appear.
    await page.getByRole('tab', { name: /physics/i }).click();
    await expect(page.locator('.challenge-banner')).toBeVisible();
    await expect(page.locator('.challenge-banner')).toContainText(/Comsat to GTO/i);
  });
});

test.describe('Q2 tech-level slider', () => {
  test('the drawer exposes a tech-level slider on each stage', async ({ page }) => {
    await fresh(page);
    // Build a 1-stage stack so the drawer has something to open.
    await page.getByRole('button', { name: /insert methane \/ lox at top of stack/i }).click();
    // Open the drawer for Stage 1.
    await page.getByRole('button', { name: /details for stage 1/i }).click();
    await expect(page.locator('.stage-drawer')).toBeVisible();
    // Tech-level slider is visible and has the expected ε bounds.
    await expect(page.locator('.tech-level-slider')).toBeVisible();
    const slider = page.locator('.tech-level-slider input[type="range"]');
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('min', '0.02');
    await expect(slider).toHaveAttribute('max', '0.3');
    // Label shows the archetype default; methalox ε = 0.07 per the catalog.
    await expect(page.locator('.tech-level-slider label')).toContainText(/ε = 0.070/);
  });
});
