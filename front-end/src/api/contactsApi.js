import { API_BASE } from "./base.js";

export async function getContacts(token) {
  const res = await fetch(`${API_BASE}/contacts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function saveContact(token, contactPhone, label = null) {
  const res = await fetch(`${API_BASE}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ contact_phone: contactPhone, label }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function deleteContact(token, contactId) {
  const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await res.json();
}
