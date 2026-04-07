import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProductsTab from './ProductsTab';
import InventoryTab from './InventoryTab';
import TransactionsTab from './TransactionsTab';
import AnalyticsTab from './AnalyticsTab';
import AlertsTab from './AlertsTab';
import ReportsTab from './ReportsTab';
import UsersTab from './UsersTab';

const pdfSaveSpy = vi.fn();

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function MockJsPDF() {
    return {
    setFontSize: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
    addPage: vi.fn(),
    save: pdfSaveSpy,
    };
  }),
}));

vi.mock('../api', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '../api';

describe('Module components', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    URL.createObjectURL = vi.fn(() => 'blob:test-url');
    URL.revokeObjectURL = vi.fn();
    pdfSaveSpy.mockClear();
  });

  test('ProductsTab loads and renders product list', async () => {
    apiRequest.mockResolvedValueOnce({
      success: true,
      data: [
        {
          product_id: 1,
          sku: 'SKU001',
          product_name: 'Laptop',
          unit_price: 50000,
          current_stock: 12,
          reorder_level: 5,
        },
      ],
      pagination: { page: 1, totalPages: 1 },
    });

    render(<ProductsTab token="token-1" role="admin" />);

    await waitFor(() => {
      expect(screen.getByText('SKU001')).toBeInTheDocument();
      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });
  });

  test('ProductsTab shows error state when products API fails', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Unable to load products'));

    render(<ProductsTab token="token-1" role="admin" />);

    await waitFor(() => {
      expect(screen.getByText(/unable to load products/i)).toBeInTheDocument();
    });
  });

  test('ProductsTab renders table with no rows for empty products response', async () => {
    apiRequest.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, totalPages: 1 },
    });

    render(<ProductsTab token="token-empty" role="admin" />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 \/ 1/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('cell', { name: 'SKU001' })).not.toBeInTheDocument();
  });

  test('InventoryTab loads summary and fetches history', async () => {
    apiRequest
      .mockResolvedValueOnce({
        success: true,
        data: {
          summary: {
            total_stock_units: 100,
            total_inventory_value: 45000,
            low_stock_items: 2,
            out_of_stock_items: 1,
          },
          items: [
            {
              product_id: 1,
              sku: 'SKU001',
              product_name: 'Laptop',
              current_stock: 10,
              reorder_level: 5,
            },
          ],
        },
      })
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({
        success: true,
        data: {
          product: { product_id: 1, sku: 'SKU001', product_name: 'Laptop', current_stock: 13, reorder_level: 5 },
          history: [
            {
              history_id: 1,
              date: '2026-03-01',
              opening_stock: 10,
              stock_in: 5,
              stock_out: 2,
              closing_stock: 13,
            },
          ],
        },
      });

    render(<InventoryTab token="token-2" />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText(/search product id or sku/i), 'SKU001');
    await userEvent.click(screen.getByRole('button', { name: /fetch history/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('token-2', '/inventory/history/1');
    });

    await waitFor(() => {
      expect(screen.getByText('2026-03-01')).toBeInTheDocument();
    });
  });

  test('TransactionsTab records stock in', async () => {
    apiRequest
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({ success: true, data: { transaction_id: 10 } })
      .mockResolvedValueOnce({ success: true, data: [] });

    render(<TransactionsTab token="token-3" />);

    await userEvent.type(screen.getByPlaceholderText(/product id/i), '1');
    await userEvent.type(screen.getByPlaceholderText(/quantity/i), '3');
    await userEvent.type(screen.getByPlaceholderText(/unit price/i), '1200');
    await userEvent.click(screen.getByRole('button', { name: /record stock in/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        'token-3',
        '/transactions/stock-in',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  test('TransactionsTab prevents duplicate submit while request is pending', async () => {
    let resolveStockIn;
    const pendingStockIn = new Promise((resolve) => {
      resolveStockIn = resolve;
    });

    apiRequest
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockReturnValueOnce(pendingStockIn)
      .mockResolvedValueOnce({ success: true, data: [] });

    render(<TransactionsTab token="token-dup" />);

    await userEvent.type(screen.getByPlaceholderText(/product id/i), '1');
    await userEvent.type(screen.getByPlaceholderText(/quantity/i), '3');
    await userEvent.type(screen.getByPlaceholderText(/unit price/i), '1200');

    const submitButton = screen.getByRole('button', { name: /record stock in/i });
    await userEvent.click(submitButton);
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
    });

    const stockInCallsBeforeResolve = apiRequest.mock.calls.filter(
      ([token, endpoint]) => token === 'token-dup' && endpoint === '/transactions/stock-in'
    );
    expect(stockInCallsBeforeResolve).toHaveLength(1);

    resolveStockIn({ success: true, data: { transaction_id: 11 } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /record stock in/i })).toBeInTheDocument();
    });
  });

  test('AnalyticsTab loads and updates by period', async () => {
    apiRequest
      .mockResolvedValueOnce({ success: true, data: [{ period: '2026-03', total_quantity: 10, total_revenue: 5000, transactions_count: 2 }] })
      .mockResolvedValueOnce({ success: true, data: [{ product_id: 1, product_name: 'Laptop', total_predicted_demand: 30, model_accuracy: 90, stockout_risk: { at_risk: false } }] })
      .mockResolvedValueOnce({ success: true, data: [{ period: '2026', total_quantity: 50, total_revenue: 20000, transactions_count: 10 }] })
      .mockResolvedValueOnce({ success: true, data: [{ product_id: 1, product_name: 'Laptop', total_predicted_demand: 40, model_accuracy: 89, stockout_risk: { at_risk: true } }] });

    render(<AnalyticsTab token="token-4" />);

    await waitFor(() => {
      expect(screen.getByText('2026-03')).toBeInTheDocument();
      expect(screen.getByText('Window size: 30 days')).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByLabelText(/sales period/i), 'yearly');

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('token-4', '/analytics/sales-trends?period=yearly');
    });
  });

  test('AnalyticsTab shows error when API request fails', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Analytics fetch failed'));

    render(<AnalyticsTab token="token-4e" />);

    await waitFor(() => {
      expect(screen.getByText(/analytics fetch failed/i)).toBeInTheDocument();
    });
  });

  test('UsersTab loads user list and shows create form for admin', async () => {
    // Mock: loadUsers on mount, then loadUsers again after create
    apiRequest.mockResolvedValue({
      success: true,
      data: [
        { user_id: 1, full_name: 'Admin User', email: 'admin@inventory.com', role: 'admin', is_active: true },
        { user_id: 2, full_name: 'Staff One', email: 'staff@inventory.com', role: 'staff', is_active: true },
      ],
    });

    render(<UsersTab token="token-5" user={{ id: 1, email: 'admin@inventory.com', role: 'admin' }} />);

    // On mount the user list is fetched
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('token-5', '/auth/users');
    });

    // List items are rendered
    await waitFor(() => {
      expect(screen.getByText('admin@inventory.com')).toBeInTheDocument();
      expect(screen.getByText('staff@inventory.com')).toBeInTheDocument();
    });

    // Admin sees the role dropdown (combobox)
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
  });

  test('UsersTab shows locked Staff role for manager', async () => {
    apiRequest.mockResolvedValueOnce({ success: true, data: [] });

    render(<UsersTab token="token-5m" user={{ id: 3, email: 'mgr@inventory.com', role: 'manager' }} />);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('token-5m', '/auth/users');
    });

    // Manager sees a read-only Staff input, not a dropdown
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByDisplayValue('Staff')).toBeInTheDocument();
  });

  test('UsersTab lets admin update role and deactivate a user', async () => {
    apiRequest
      .mockResolvedValueOnce({
        success: true,
        data: [
          { user_id: 1, full_name: 'Admin User', email: 'admin@inventory.com', role: 'admin', is_active: true },
          { user_id: 2, full_name: 'Staff One', email: 'staff@inventory.com', role: 'staff', is_active: true },
        ],
      })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({
        success: true,
        data: [
          { user_id: 1, full_name: 'Admin User', email: 'admin@inventory.com', role: 'admin', is_active: true },
          { user_id: 2, full_name: 'Staff One', email: 'staff@inventory.com', role: 'manager', is_active: true },
        ],
      })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({
        success: true,
        data: [
          { user_id: 1, full_name: 'Admin User', email: 'admin@inventory.com', role: 'admin', is_active: true },
          { user_id: 2, full_name: 'Staff One', email: 'staff@inventory.com', role: 'manager', is_active: false },
        ],
      });

    render(<UsersTab token="token-6" user={{ id: 1, email: 'admin@inventory.com', role: 'admin' }} />);

    await waitFor(() => {
      expect(screen.getByText('staff@inventory.com')).toBeInTheDocument();
    });

    const roleSelector = screen.getByLabelText('Role for staff@inventory.com');
    await userEvent.selectOptions(roleSelector, 'manager');

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('token-6', '/auth/users/2/role', {
        method: 'PUT',
        body: JSON.stringify({ role: 'manager' }),
      });
    });

    await userEvent.click(screen.getByRole('button', { name: 'Deactivate staff@inventory.com' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('token-6', '/auth/users/2/deactivate', {
        method: 'PUT',
      });
    });
  });

  test('AlertsTab renders mapped low stock alerts', async () => {
    apiRequest
      .mockResolvedValueOnce({ success: true, data: { scanned_products: 1, at_risk_products: 1, horizon_days: 30 } })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            product_id: 9,
            sku: 'SKU009',
            product_name: 'Monitor',
            current_stock: 2,
            reorder_level: 5,
            updated_at: '2026-03-23T10:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            product_id: 9,
            sku: 'SKU009',
            product_name: 'Monitor',
            total_predicted_demand: 12,
            stockout_risk: { at_risk: true, estimated_days_to_stockout: 4 },
          },
        ],
      });

    render(<AlertsTab token="token-6" />);

    await waitFor(() => {
      expect(screen.getByText(/low stock/i)).toBeInTheDocument();
      expect(screen.getAllByText(/monitor/i).length).toBeGreaterThan(0);
    });
  });

  test('AlertsTab shows empty-state card when no alerts are available', async () => {
    apiRequest
      .mockResolvedValueOnce({ success: true, data: { scanned_products: 0, at_risk_products: 0, horizon_days: 30 } })
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({ success: true, data: [] });

    render(<AlertsTab token="token-empty-alerts" />);

    await waitFor(() => {
      expect(screen.getByText(/no active low-stock or forecast alerts/i)).toBeInTheDocument();
    });
  });

  test('AlertsTab shows error when refresh call fails', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Unable to refresh alerts'));

    render(<AlertsTab token="token-alert-error" />);

    await waitFor(() => {
      expect(screen.getByText(/unable to refresh alerts/i)).toBeInTheDocument();
    });
  });

  test('ReportsTab loads dashboard and transaction previews', async () => {
    apiRequest
      .mockResolvedValueOnce({
        success: true,
        data: {
          total_products: 4,
          total_stock_value: 40000,
          low_stock_items: 1,
          out_of_stock_items: 0,
          recent_sales: 5000,
          recent_sales_transactions: 2,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            transaction_id: 1,
            product_name: 'Laptop',
            transaction_type: 'out',
            quantity: 2,
            total_amount: 100000,
            transaction_date: '2026-03-23T10:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            product_id: 1,
            sku: 'SKU001',
            product_name: 'Laptop',
            current_stock: 5,
            total_predicted_demand: 18,
            average_daily_demand: 0.6,
            model_accuracy: 88,
            stockout_risk: { at_risk: false },
          },
        ],
      });

    render(<ReportsTab token="token-7" />);

    await waitFor(() => {
      expect(screen.getByText(/export reports/i)).toBeInTheDocument();
      expect(screen.getByText(/recent transactions preview/i)).toBeInTheDocument();
      expect(screen.getByText(/laptop/i)).toBeInTheDocument();
    });
  });

  test('ReportsTab shows error when report APIs fail', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Reports service unavailable'));

    render(<ReportsTab token="token-report-error" />);

    await waitFor(() => {
      expect(screen.getByText(/reports service unavailable/i)).toBeInTheDocument();
    });
  });

  test('ReportsTab renders report shell for empty data', async () => {
    apiRequest
      .mockResolvedValueOnce({ success: true, data: null })
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({ success: true, data: [] });

    render(<ReportsTab token="token-report-empty" />);

    await waitFor(() => {
      expect(screen.getByText(/export reports/i)).toBeInTheDocument();
      expect(screen.getByText(/recent transactions preview/i)).toBeInTheDocument();
    });
  });

  test('ReportsTab exports inventory summary CSV with expected filename', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    apiRequest
      .mockResolvedValueOnce({
        success: true,
        data: {
          total_products: 4,
          total_stock_value: 40000,
          low_stock_items: 1,
          out_of_stock_items: 0,
          recent_sales: 5000,
          recent_sales_transactions: 2,
        },
      })
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({ success: true, data: [] });

    render(<ReportsTab token="token-report-export-csv" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export inventory summary/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /export inventory summary/i }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });

  test('ReportsTab exports forecast summary PDF with expected filename', async () => {
    apiRequest
      .mockResolvedValueOnce({ success: true, data: null })
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            product_id: 1,
            sku: 'SKU001',
            product_name: 'Laptop',
            total_predicted_demand: 18,
            model_accuracy: 88,
            stockout_risk: { at_risk: false },
          },
        ],
      });

    render(<ReportsTab token="token-report-export-pdf" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export forecast summary \(pdf\)/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /export forecast summary \(pdf\)/i }));

    expect(pdfSaveSpy).toHaveBeenCalledWith('forecast-summary.pdf');
  });
});
