import { API_BASE as BASE } from "./base.js";

function authed(token) {
  return { Authorization: `Bearer ${token}` };
}

async function request(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authed(token), ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export function getBalance(token) {
  return request("/wallets/balance", token);
}

export function getTransactions(token, limit = 20, offset = 0) {
  return request(`/users/me/transactions?limit=${limit}&offset=${offset}`, token);
}

export function floatTopup(token, amount) {
  return request("/wallets/float-topup", token, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export function getFloatRequests(token) {
  return request("/wallets/float-requests", token);
}
