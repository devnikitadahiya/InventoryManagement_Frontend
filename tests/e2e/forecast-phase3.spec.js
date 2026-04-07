import { test, expect } from '@playwright/test';

function mockPhase3Api(page) {
  const state = {
    products: [
      {
        product_id: 1,
        sku: 'SKU001',
        product_name: 'Laptop',
        current_stock: 3,
        reorder_level: 8,
      },
      {
        product_id: 2,
        sku: 'SKU002',
        product_name: 'Mouse',
        current_stock: 40,
        reorder_level: 10,
      },
    ],
  };

  const fulfill = (route, body) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

  const buildResponse = (path, method) => {
    if (path === '/auth/login' && method === 'POST') {
      return {
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
      };
    }

    if (path === '/auth/me' && method === 'GET') {
      return {
        success: true,
        user: {
          id: 1,
          full_name: 'Admin User',
          email: 'admin@inventory.com',
          role: 'admin',
        },
      };
    }

    if (path === '/analytics/dashboard' && method === 'GET') {
      return {
        success: true,
        data: {
          total_products: 2,
          total_stock_value: 320000,
          low_stock_items: 1,
          out_of_stock_items: 0,
          recent_sales: 64000,
          recent_sales_transactions: 8,
          top_selling_products: [
            { product_id: 1, sku: 'SKU001', product_name: 'Laptop', quantity_sold: 10 },
          ],
        },
      };
    }

    if (path === '/analytics/sales-trends' && method === 'GET') {
      return {
        success: true,
        data: [
          { period: '2026-02', total_quantity: 12, total_revenue: 40000, transactions_count: 3 },
          { period: '2026-03', total_quantity: 16, total_revenue: 60000, transactions_count: 5 },
        ],
      };
    }

    if (path === '/forecast/summary' && method === 'GET') {
      return {
        success: true,
        data: state.products.map((item) => ({
          product_id: item.product_id,
          sku: item.sku,
          product_name: item.product_name,
          current_stock: item.current_stock,
          total_predicted_demand: item.product_id === 1 ? 26 : 14,
          average_daily_demand: item.product_id === 1 ? 3.7 : 1.2,
          model_accuracy: item.product_id === 1 ? 89 : 92,
          stockout_risk: item.product_id === 1
            ? {
                at_risk: true,
                estimated_days_to_stockout: 5,
                projected_stockout_date: '2026-04-12',
              }
            : {
                at_risk: false,
                estimated_days_to_stockout: 37,
                projected_stockout_date: null,
              },
        })),
      };
    }

    if (path === '/forecast/refresh-alerts' && method === 'POST') {
      return {
        success: true,
        data: {
          scanned_products: 2,
          at_risk_products: 1,
          horizon_days: 30,
        },
      };
    }

    if (path === '/inventory/low-stock' && method === 'GET') {
      return {
        success: true,
        data: [
          {
            product_id: 1,
            sku: 'SKU001',
            product_name: 'Laptop',
            current_stock: 3,
            reorder_level: 8,
            updated_at: new Date().toISOString(),
          },
        ],
      };
    }

    if (path.startsWith('/transactions') && method === 'GET') {
      return {
        success: true,
        data: [
          {
            transaction_id: 1,
            product_name: 'Laptop',
            transaction_type: 'out',
            quantity: 2,
            total_amount: 120000,
            transaction_date: new Date().toISOString(),
            reference_number: 'INV-001',
          },
        ],
      };
    }

    return null;
  };

  return page.route('http://localhost:5000/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace('/api', '');

    const response = buildResponse(path, method);
    if (response) {
      return fulfill(route, response);
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: `Unhandled mock route: ${method} ${path}` }),
    });
  });
}

test('phase 3 forecast showcase flow', async ({ page }) => {
  await mockPhase3Api(page);

  await page.goto('/');

  await page.getByLabel('Email').fill('admin@inventory.com');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Inventory Dashboard' })).toBeVisible();
  await expect(page.getByText('Predicted Demand (30d)')).toBeVisible();

  await page.getByRole('link', { name: 'Analytics' }).click();
  await expect(page.getByRole('heading', { name: 'Forecast Summary' })).toBeVisible();
  await expect(page.getByText('At risk')).toBeVisible();

  await page.getByRole('link', { name: 'Alerts' }).click();
  await expect(page.getByText('Predicted stockout')).toBeVisible();

  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByRole('button', { name: 'Export Forecast Summary (CSV)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Forecast Summary (PDF)' })).toBeVisible();
});
