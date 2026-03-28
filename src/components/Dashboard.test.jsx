import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Dashboard from './Dashboard';

vi.mock('../api', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '../api';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('loads dashboard data and renders overview cards', async () => {
    apiRequest
      .mockResolvedValueOnce({
        success: true,
        data: {
          total_products: 12,
          total_stock_value: 500000,
          low_stock_items: 2,
          out_of_stock_items: 1,
          top_selling_products: [],
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: [{ period: '2026-03', total_revenue: 45000 }],
      });

    render(
      <MemoryRouter initialEntries={['/overview']}>
        <Dashboard
          token="test-token"
          user={{ full_name: 'Admin User', role: 'admin' }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/total products/i)).toBeInTheDocument();
      expect(screen.getByText(/12/)).toBeInTheDocument();
    });
  });

  test('hides admin-only and manager-only tabs for staff role', async () => {
    apiRequest
      .mockResolvedValueOnce({
        success: true,
        data: {
          total_products: 1,
          total_stock_value: 100,
          low_stock_items: 0,
          out_of_stock_items: 0,
          top_selling_products: [],
        },
      })
      .mockResolvedValueOnce({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/overview']}>
        <Dashboard
          token="staff-token"
          user={{ full_name: 'Staff User', role: 'staff' }}
          onLogout={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /overview/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /reports/i })).not.toBeInTheDocument();
    });
  });
});
