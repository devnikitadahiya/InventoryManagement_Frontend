import { describe, expect, test, vi, beforeEach } from 'vitest';
import { apiRequest, UNAUTHORIZED_EVENT } from './api';

describe('apiRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('returns payload when response is successful', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { value: 1 } }),
    });

    const payload = await apiRequest('token-123', '/health');

    expect(payload.success).toBe(true);
    expect(payload.data.value).toBe(1);
  });

  test('throws error when API responds with failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: 'Unauthorized' }),
    });

    await expect(apiRequest('bad-token', '/products')).rejects.toThrow('Unauthorized');
  });

  test('dispatches unauthorized event when API returns 401', async () => {
    const eventSpy = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, eventSpy);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Invalid or expired token' }),
    });

    await expect(apiRequest('expired-token', '/auth/me')).rejects.toThrow('Invalid or expired token');

    expect(eventSpy).toHaveBeenCalledTimes(1);
    window.removeEventListener(UNAUTHORIZED_EVENT, eventSpy);
  });
});
