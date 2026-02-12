import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads and shows main content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/COMFOTRADE/i);
  });

  test('has logo', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByAltText('ComfoTrade')).toBeVisible();
  });

  test('has navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /о компании/i })).toBeVisible();
  });
});
