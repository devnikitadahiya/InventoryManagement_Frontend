import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test('submits credentials and calls onLoginSuccess on successful login', async () => {
    const onLoginSuccess = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          token: 'jwt-token',
          user: { user_id: 1, full_name: 'Admin User', role: 'admin' },
        },
      }),
    });

    render(<LoginForm onLoginSuccess={onLoginSuccess} />);

    await userEvent.clear(screen.getByLabelText(/email/i));
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@inventory.com');
    await userEvent.clear(screen.getByLabelText(/password/i));
    await userEvent.type(screen.getByLabelText(/password/i), 'admin123');

    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('inventory_token')).toBe('jwt-token');
    });
  });

  test('shows error message on failed login', async () => {
    const onLoginSuccess = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: 'Invalid email or password' }),
    });

    render(<LoginForm onLoginSuccess={onLoginSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@inventory.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');

    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      expect(onLoginSuccess).not.toHaveBeenCalled();
    });
  });

  test('shows fallback error when network request fails', async () => {
    const onLoginSuccess = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network request failed'));

    render(<LoginForm onLoginSuccess={onLoginSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@inventory.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'admin123');

    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/network request failed/i)).toBeInTheDocument();
      expect(onLoginSuccess).not.toHaveBeenCalled();
    });
  });
});
