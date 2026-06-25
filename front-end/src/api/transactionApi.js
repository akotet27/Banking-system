const BASE = "http://localhost:8000";

async function request(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

function idempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function sendMoney(token, { recipient_phone, amount }) {
  return request("/transactions/send", token, {
    method: "POST",
    body: JSON.stringify({ recipient_phone, amount, idempotency_key: idempotencyKey() }),
  });
}

export function cashIn(token, { customer_phone, amount }) {
  return request("/transactions/cash-in", token, {
    method: "POST",
    body: JSON.stringify({ customer_phone, amount, idempotency_key: idempotencyKey() }),
  });
}

export function initiateCashOut(token, { customer_phone, amount }) {
  return request("/transactions/cash-out/initiate", token, {
    method: "POST",
    body: JSON.stringify({ customer_phone, amount }),
  });
}

export function confirmCashOut(token, session_id) {
  return request("/transactions/cash-out/confirm", token, {
    method: "POST",
    body: JSON.stringify({ session_id }),
  });
}

export function payMerchant(token, { merchant_phone, amount }) {
  return request("/transactions/pay-merchant", token, {
    method: "POST",
    body: JSON.stringify({ merchant_phone, amount, idempotency_key: idempotencyKey() }),
  });
}

export function submitKyc(token, id_document_ref) {
  return request("/kyc/submit", token, {
    method: "POST",
    body: JSON.stringify({ id_document_ref }),
  });
}
