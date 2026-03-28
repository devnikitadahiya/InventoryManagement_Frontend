import { describe, expect, test, vi, beforeEach } from 'vitest';
import { apiRequest } from './api';

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
});
