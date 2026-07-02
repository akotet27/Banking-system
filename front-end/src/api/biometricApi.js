import { API_BASE as BASE } from "./base.js";

async function request(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export function enrollBegin(token, enrollment_type = "customer_phone", device_label = "My device") {
  return request("/biometric/enroll/begin", token, {
    method: "POST",
    body: JSON.stringify({ enrollment_type, device_label }),
  });
}

export function enrollFinish(token, enrollment_type, credential) {
  return request("/biometric/enroll/finish", token, {
    method: "POST",
    body: JSON.stringify({ enrollment_type, credential }),
  });
}

export function listCredentials(token) {
  return request("/biometric/credentials", token);
}

export function deleteCredential(token, credentialId) {
  return request(`/biometric/credentials/${credentialId}`, token, { method: "DELETE" });
}

export function authenticateBegin(token) {
  return request("/biometric/authenticate/begin", token, { method: "POST" });
}

export function authenticateFinish(token, credential) {
  return request("/biometric/authenticate/finish", token, {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}
