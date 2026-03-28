import { test, expect } from '@playwright/test';

test('login page loads and allows typing credentials', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Smart Inventory' })).toBeVisible();

  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Password');

  await emailInput.fill('admin@inventory.com');
  await passwordInput.fill('admin123');

  await expect(emailInput).toHaveValue('admin@inventory.com');
  await expect(passwordInput).toHaveValue('admin123');
});
