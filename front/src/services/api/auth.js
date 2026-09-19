const API_BASE_URL = 'http://localhost:8000/api';

async function request(path, options) {
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

export async function login(email, password) {
  const normalizedEmail = email?.trim();
  if (!normalizedEmail || !password) {
    throw new Error('Email và mật khẩu không được để trống.');
  }

  return request('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ account: normalizedEmail, password })
  });
}

export async function sendOtp(account) {
  const normalizedAccount = account?.trim();
  if (!normalizedAccount) {
    throw new Error('Vui lòng nhập email hoặc số điện thoại.');
  }
  return request('/auth/send-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ account: normalizedAccount })
  });
}

export async function verifyOtp(account, code) {
  const normalizedAccount = account?.trim();
  const normalizedCode = code?.trim();
  if (!normalizedAccount || !/^\d{6}$/.test(normalizedCode)) {
    throw new Error('Mã OTP không hợp lệ.');
  }

  return request('/auth/verify-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ account: normalizedAccount, code: normalizedCode })
  });
}

export async function completeRegister(tempToken, password, confirmPassword) {
  if (!tempToken || !password || !confirmPassword) {
    throw new Error('Thông tin đăng ký chưa hợp lệ.');
  }

  if (password.length < 8) {
    throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');
  }

  if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Mật khẩu phải có ít nhất 1 chữ hoa và 1 chữ số.');
  }

  if (password !== confirmPassword) {
    throw new Error('Mật khẩu xác nhận không khớp.');
  }

  return request('/auth/complete-register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tempToken, password, confirmPassword })
  });
}
