import { test, expect } from '@playwright/test';

function buildApiMocks(page) {
  const state = {
    products: [
      {
        product_id: 1,
        sku: 'SKU001',
        product_name: 'Laptop',
        unit_price: 50000,
        current_stock: 12,
        reorder_level: 5,
      },
      {
        product_id: 2,
        sku: 'SKU002',
        product_name: 'Mouse',
        unit_price: 1200,
        current_stock: 30,
        reorder_level: 10,
      },
    ],
    nextId: 3,
  };

  return page.route('http://localhost:5000/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace('/api', '');

    const json = (body) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

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

    if (path === '/auth/me' && method === 'GET') {
      return json({
        success: true,
        user: {
          id: 1,
          full_name: 'Admin User',
          email: 'admin@inventory.com',
          role: 'admin',
        },
      });
    }

    if (path === '/analytics/dashboard' && method === 'GET') {
      return json({
        success: true,
        data: {
          total_products: state.products.length,
          total_stock_value: state.products.reduce((sum, item) => sum + item.unit_price * item.current_stock, 0),
          low_stock_items: state.products.filter((item) => item.current_stock <= item.reorder_level).length,
          out_of_stock_items: state.products.filter((item) => item.current_stock === 0).length,
          recent_sales: 45000,
          recent_sales_transactions: 5,
          top_selling_products: [
            { product_id: 1, sku: 'SKU001', product_name: 'Laptop', quantity_sold: 8 },
          ],
        },
      });
    }

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
        data: state.products.map((item) => ({
          product_id: item.product_id,
          sku: item.sku,
          product_name: item.product_name,
          current_stock: item.current_stock,
          total_predicted_demand: 18,
          average_daily_demand: 0.6,
          model_accuracy: 87,
          stockout_risk: {
            at_risk: item.current_stock < item.reorder_level,
            estimated_days_to_stockout: item.current_stock < item.reorder_level ? 6 : 42,
            projected_stockout_date: item.current_stock < item.reorder_level ? '2026-04-14' : null,
          },
        })),
      });
    }

    if (path === '/forecast/refresh-alerts' && method === 'POST') {
      return json({
        success: true,
        data: {
          scanned_products: state.products.length,
          at_risk_products: state.products.filter((item) => item.current_stock < item.reorder_level).length,
          horizon_days: 30,
        },
      });
    }

    if (path.startsWith('/products') && method === 'GET') {
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const filteredProducts = state.products.filter((item) => {
        if (!search) {
          return true;
        }
        return item.product_name.toLowerCase().includes(search) || item.sku.toLowerCase().includes(search);
      });

      return json({
        success: true,
        data: filteredProducts,
        pagination: {
          page: 1,
          limit: 10,
          total: filteredProducts.length,
          totalPages: 1,
        },
      });
    }

    if (path === '/products' && method === 'POST') {
      const payload = JSON.parse(request.postData() || '{}');
      const product = {
        product_id: state.nextId++,
        sku: payload.sku,
        product_name: payload.product_name,
        unit_price: payload.unit_price,
        current_stock: payload.current_stock,
        reorder_level: payload.reorder_level,
      };
      state.products.unshift(product);

      return json({
        success: true,
        data: product,
      });
    }

    if (path.match(/^\/products\/\d+$/) && method === 'PUT') {
      const productId = Number(path.split('/').pop());
      const payload = JSON.parse(request.postData() || '{}');
      state.products = state.products.map((item) => item.product_id === productId
        ? { ...item, ...payload }
        : item);

      return json({
        success: true,
        data: state.products.find((item) => item.product_id === productId),
      });
    }

    if (path.match(/^\/products\/\d+$/) && method === 'DELETE') {
      const productId = Number(path.split('/').pop());
      state.products = state.products.filter((item) => item.product_id !== productId);

      return json({
        success: true,
      });
    }

    if (path === '/inventory/status' && method === 'GET') {
      return json({
        success: true,
        data: {
          summary: {
            total_stock_units: 42,
            total_inventory_value: 54000,
            low_stock_items: 1,
            out_of_stock_items: 0,
          },
          items: [],
        },
      });
    }

    if (path === '/inventory/low-stock' && method === 'GET') {
      return json({ success: true, data: [] });
    }

    if (path.startsWith('/transactions') && method === 'GET') {
      return json({ success: true, data: [] });
    }

    if (path.startsWith('/transactions/stock-') && method === 'POST') {
      return json({ success: true, data: { transaction_id: 1 } });
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: `Unhandled mock route: ${method} ${path}` }),
    });
  });
}

test('full login to dashboard to products CRUD flow', async ({ page }) => {
  await buildApiMocks(page);

  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/');

  await page.getByLabel('Email').fill('admin@inventory.com');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Inventory Dashboard' })).toBeVisible();
  await expect(page.getByText('Welcome, Admin User')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Products' })).toBeVisible();

  await page.getByRole('link', { name: 'Products' }).click();
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  await expect(page.getByText('Laptop')).toBeVisible();

  const productForm = page.locator('form.grid-form').first();

  await productForm.getByPlaceholder('SKU', { exact: true }).fill('SKU100');
  await productForm.getByPlaceholder('Product name').fill('Mechanical Keyboard');
  await productForm.getByPlaceholder('Unit price').fill('3500');
  await productForm.getByPlaceholder('Current stock').fill('20');
  await productForm.getByPlaceholder('Reorder level').fill('4');
  await page.getByRole('button', { name: 'Add Product' }).click();

  await expect(page.getByText('Mechanical Keyboard')).toBeVisible();

  const productRow = page.locator('tr', { hasText: 'Mechanical Keyboard' });
  await productRow.getByRole('button', { name: 'Edit' }).click();
  await productForm.getByPlaceholder('Product name').fill('Mechanical Keyboard Pro');
  await page.getByRole('button', { name: 'Update Product' }).click();

  await expect(page.getByText('Mechanical Keyboard Pro')).toBeVisible();

  const updatedRow = page.locator('tr', { hasText: 'Mechanical Keyboard Pro' });
  await updatedRow.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('Mechanical Keyboard Pro')).not.toBeVisible();
});
