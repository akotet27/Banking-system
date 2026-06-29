import { API_BASE as BASE } from "./base.js";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    // Network error (backend down, CORS block, etc.)
    const err = new Error("Network error");
    err._status = 0;
    throw err;
  }
  const data = await res.json();
  if (!res.ok) {
    const err = typeof data === "object" ? { ...data } : { detail: "Request failed" };
    err._status = res.status;
    throw err;
  }
  return data;
}

export function register({ phone_number, email, password, role, full_name, date_of_birth, location }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ phone_number, email, password, role, full_name, date_of_birth, location }),
  });
}

export function verifyEmail(phone_number, code) {
  return request("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ phone_number, code, purpose: "signup" }),
  });
}

export function resendOtp(phone_number, purpose = "signup") {
  return request("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ phone_number, purpose }),
  });
}

export function login(phone_number, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone_number, password }),
  });
}

export function getMe(token) {
  return request("/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function forgotPassword(phone_number) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ phone_number }),
  });
}

export function resetPassword(phone_number, code, new_password) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ phone_number, code, new_password }),
  });
}
