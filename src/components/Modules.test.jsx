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

vi.mock('../api', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '../api';

describe('Module components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          items: [],
        },
      })
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({
        success: true,
        data: {
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

    await userEvent.type(screen.getByPlaceholderText(/enter product id/i), '1');
    await userEvent.click(screen.getByRole('button', { name: /fetch history/i }));

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

  test('AnalyticsTab loads and updates by period', async () => {
    apiRequest
      .mockResolvedValueOnce({ success: true, data: [{ period: '2026-03', total_quantity: 10, total_revenue: 5000, transactions_count: 2 }] })
      .mockResolvedValueOnce({ success: true, data: [{ period: '2026', total_quantity: 50, total_revenue: 20000, transactions_count: 10 }] });

    render(<AnalyticsTab token="token-4" />);

    await waitFor(() => {
      expect(screen.getByText('2026-03')).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByRole('combobox'), 'yearly');

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('token-4', '/analytics/sales-trends?period=yearly');
    });
  });

  test('UsersTab loads user list and shows create form for admin', async () => {
    // Mock: loadUsers on mount, then loadUsers again after create
    apiRequest.mockResolvedValue({
      success: true,
      data: [
        { user_id: 1, full_name: 'Admin User', email: 'admin@inventory.com', role: 'admin' },
        { user_id: 2, full_name: 'Staff One', email: 'staff@inventory.com', role: 'staff' },
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
    expect(screen.getByRole('combobox')).toBeInTheDocument();
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

  test('AlertsTab renders mapped low stock alerts', async () => {
    apiRequest.mockResolvedValueOnce({
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
    });

    render(<AlertsTab token="token-6" />);

    await waitFor(() => {
      expect(screen.getByText(/low stock/i)).toBeInTheDocument();
      expect(screen.getByText(/monitor/i)).toBeInTheDocument();
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
      });

    render(<ReportsTab token="token-7" />);

    await waitFor(() => {
      expect(screen.getByText(/export reports/i)).toBeInTheDocument();
      expect(screen.getByText(/recent transactions preview/i)).toBeInTheDocument();
      expect(screen.getByText(/laptop/i)).toBeInTheDocument();
    });
  });
});
