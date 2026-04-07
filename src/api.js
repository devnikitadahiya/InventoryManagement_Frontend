import { API_BASE_URL } from './config';

export const UNAUTHORIZED_EVENT = 'inventory:unauthorized';

export async function apiRequest(token, path, options = {}) {
  const customHeaders = options.headers ?? {};

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...customHeaders,
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.status === 401) {
    globalThis.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, {
      detail: {
        path,
        status: response.status,
        message: payload?.message || 'Unauthorized',
      },
    }));
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload;
}
