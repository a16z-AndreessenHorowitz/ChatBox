const API_BASE_URL = 'http://localhost:8000/api';

export async function request(path, options = {}) {
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Yêu cầu thất bại.');
  }

  return data;
}