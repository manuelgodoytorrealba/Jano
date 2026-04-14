const API_BASE_URL = '/api';

export function apiUrl(path = ''): string {
  if (!path) {
    return API_BASE_URL;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
