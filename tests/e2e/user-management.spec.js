import { test, expect } from '@playwright/test';

function buildApiMocks(page) {
  const state = {
    users: [
      {
        user_id: 1,
        full_name: 'Admin User',
        email: 'admin@inventory.com',
        role: 'admin',
        is_active: true,
      },
      {
        user_id: 2,
        full_name: 'Staff User',
        email: 'staff@inventory.com',
        role: 'staff',
        is_active: true,
      },
    ],
  };

  return page.route('http://localhost:5000/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace('/api', '');

    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    // Auth — login
    if (path === '/auth/login' && method === 'POST') {
      return json({
        success: true,
        data: {
          token: 'playwright-token',
          user: {
            user_id: 1,
            full_name: 'Admin User',
            email: 'admin@inventory.com',
            role: 'admin',
          },
        },
      });
    }

    // Auth — current user
    if (path === '/auth/me' && method === 'GET') {
      return json({
        success: true,
        user: { id: 1, full_name: 'Admin User', email: 'admin@inventory.com', role: 'admin' },
      });
    }

    // Analytics — dashboard summary (needed on first load)
    if (path === '/analytics/dashboard' && method === 'GET') {
      return json({
        success: true,
        data: {
          total_products: 5,
          total_stock_value: 250000,
          low_stock_items: 1,
          out_of_stock_items: 0,
          recent_sales: 45000,
          recent_sales_transactions: 5,
          top_selling_products: [],
        },
      });
    }

    // Analytics — sales trends
    if (path === '/analytics/sales-trends' && method === 'GET') {
      return json({
        success: true,
        data: [
          { period: '2026-01', total_quantity: 10, total_revenue: 30000, transactions_count: 2 },
          { period: '2026-02', total_quantity: 15, total_revenue: 45000, transactions_count: 3 },
        ],
      });
    }

    if (path === '/forecast/summary' && method === 'GET') {
      return json({
        success: true,
        data: [
          {
            product_id: 1,
            sku: 'SKU001',
            product_name: 'Laptop',
            current_stock: 12,
            total_predicted_demand: 19,
            average_daily_demand: 0.63,
            model_accuracy: 88,
            stockout_risk: { at_risk: false, estimated_days_to_stockout: 42, projected_stockout_date: null },
          },
        ],
      });
    }

    // Users — get all
    if (path === '/auth/users' && method === 'GET') {
      return json({ success: true, data: state.users });
    }

    // Users — update role
    if (path.match(/^\/auth\/users\/\d+\/role$/) && method === 'PUT') {
      const userId = Number(path.split('/')[3]);
      const payload = JSON.parse(request.postData() || '{}');
      state.users = state.users.map((u) =>
        u.user_id === userId ? { ...u, role: payload.role } : u,
      );
      return json({ success: true, message: 'Role updated successfully' });
    }

    // Users — deactivate
    if (path.match(/^\/auth\/users\/\d+\/deactivate$/) && method === 'PUT') {
      const userId = Number(path.split('/')[3]);
      state.users = state.users.map((u) =>
        u.user_id === userId ? { ...u, is_active: false } : u,
      );
      return json({ success: true, message: 'User deactivated' });
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: `Unhandled mock route: ${method} ${path}` }),
    });
  });
}

test('admin can view users, update a role, and deactivate a user', async ({ page }) => {
  await buildApiMocks(page);

  // Auto-accept the browser confirm dialog for deactivation
  page.on('dialog', (dialog) => dialog.accept());

  // Step 1: Login
  await page.goto('/');
  await page.getByLabel('Email').fill('admin@inventory.com');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Inventory Dashboard' })).toBeVisible();

  // Step 2: Navigate to Users tab
  await page.getByRole('link', { name: 'Users' }).click();
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

  // Step 3: Verify both users are shown in the table
  await expect(page.getByText('Admin User')).toBeVisible();
  await expect(page.getByText('Staff User')).toBeVisible();
  await expect(page.getByText('staff@inventory.com')).toBeVisible();

  // Step 4: Change staff user's role to manager
  const staffRoleSelect = page.getByRole('combobox', { name: 'Role for staff@inventory.com' });
  await expect(staffRoleSelect).toBeVisible();
  await staffRoleSelect.selectOption('manager');

  // Verify success message after role update
  await expect(page.getByText('User role updated successfully')).toBeVisible();

  // Step 5: Deactivate the staff user (now manager)
  const deactivateBtn = page.getByRole('button', { name: 'Deactivate staff@inventory.com' });
  await expect(deactivateBtn).toBeVisible();
  await deactivateBtn.click();

  // Verify success message after deactivation
  await expect(page.getByText('User deactivated successfully')).toBeVisible();

  // Verify the user now shows as Inactive
  const staffRow = page.locator('tr', { hasText: 'staff@inventory.com' });
  await expect(staffRow.getByText('Inactive')).toBeVisible();

  // Verify that the deactivate button is now disabled for the deactivated user
  await expect(deactivateBtn).toBeDisabled();
});
