import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from './App';
import { TOKEN_KEY } from './config';

vi.mock('./api', () => ({
  UNAUTHORIZED_EVENT: 'inventory:unauthorized',
  apiRequest: vi.fn(),
}));

vi.mock('./components/LoginForm', () => ({
  default: ({ onLoginSuccess }) => (
    <div>
      <p>Login Form Mock</p>
      <button onClick={() => onLoginSuccess({ token: 'new-token', user: { role: 'admin' } })}>Mock Login</button>
    </div>
  ),
}));

vi.mock('./components/Dashboard', () => ({
  default: () => <p>Dashboard Mock</p>,
}));

import { apiRequest } from './api';

const UNAUTHORIZED_EVENT = 'inventory:unauthorized';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('auto logout on unauthorized event', async () => {
    localStorage.setItem(TOKEN_KEY, 'saved-token');
    apiRequest.mockResolvedValueOnce({ success: true, user: { role: 'admin' } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Mock')).toBeInTheDocument();
    });

    await act(async () => {
      globalThis.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { status: 401 } }));
    });

    await waitFor(() => {
      expect(screen.getByText('Login Form Mock')).toBeInTheDocument();
    });
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
