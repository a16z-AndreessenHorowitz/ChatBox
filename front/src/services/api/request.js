const API_BASE_URL = "http://localhost:8000/api";
let accessToken = null;
let refreshPromise = null;

//dùng để set accessToken khi login thành công
export function setAccessToken(token) {
  accessToken = token || null;
}
//clear accessToken khi logout hoặc refresh token thất bại
export function clearAccessToken() {
  accessToken = null;
}

//dùng để parse response từ server, nếu response không có body thì trả về object rỗng
async function parseResponse(response) {
  let data = {};
  try {
    data = await response.json();
  } catch {
    /* Empty response body. */
  }
  return data;
}

//cấp lại accesToken khi hết hạn
export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        const data = await parseResponse(response);
        if (!response.ok)
          throw new Error(data.detail || "Phiên đăng nhập đã hết hạn.");
        setAccessToken(data.token);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function requestRaw(path, options = {}) {
  const send = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

  let response = await send();
  // chỉ tự động refresh token khi request API thông thường bị lỗi 401, không áp dụng cho các API thuộc nhóm /auth/.
  if (response.status === 401 && !path.startsWith("/auth/")) {
    try {
      await refreshAccessToken();
      response = await send();
    } catch {
      clearAccessToken();
    }
  }
  if (!response.ok) {
    const data = await parseResponse(response);
    throw new Error(data.detail || data.message || "Yêu cầu thất bại.");
  }
  return response;
}

export async function request(path, options = {}) {
  const response = await requestRaw(path, options);
  return parseResponse(response);
}
