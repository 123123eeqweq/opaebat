import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/вход/i);
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/регистрация/i);
  });

  test('main page has login/register panel', async ({ page }) => {
    await page.goto('/?auth=login');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });
});
