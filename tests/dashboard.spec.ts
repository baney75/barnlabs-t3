import { test, expect } from '@playwright/test';

test.describe.skip('Dashboard flow', () => {
  test('user logs in, opens editor, adds model viewer, saves layout', async ({ page }) => {
    await page.goto('/');
    // This is a stub. Real implementation would use programmatic login and interact with dashboard.
    await expect(page).toHaveTitle(/BarnLabs/i);
  });
});


