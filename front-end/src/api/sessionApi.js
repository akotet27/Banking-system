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

export function getSessionStatus(token, session_id) {
  return request(`/sessions/${session_id}/status`, token);
}

export function beginApproval(token, session_id) {
  return request(`/sessions/${session_id}/begin-approval`, token, { method: "POST" });
}

export function approveSession(token, session_id, approval_method, webauthn_response = null) {
  return request(`/sessions/${session_id}/approve`, token, {
    method: "POST",
    body: JSON.stringify({ approval_method, webauthn_response }),
  });
}

export function getPendingSessions(token) {
  return request("/sessions/pending", token);
}

export function approveSessionSimple(token, session_id) {
  return request(`/sessions/${session_id}/approve-simple`, token, { method: "POST" });
}

export function declineSession(token, session_id) {
  return request(`/sessions/${session_id}/decline`, token, { method: "POST" });
}
