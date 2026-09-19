const API_BASE_URL = 'http://localhost:8000/api';

export async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
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