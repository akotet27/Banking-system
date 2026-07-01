export function validatePhone(value) {
  if (!value) return "Phone number is required";
  if (!/^\+\d{10,15}$/.test(value)) return "Use E.164 format, e.g. +250788123456";
  return null;
}

export function validateEmail(value) {
  if (!value) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email address";
  return null;
}

export function validatePassword(value) {
  if (!value) return "Password is required";
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(value)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must contain at least one special character";
  return null;
}

export function validateAmount(value) {
  const n = parseFloat(value);
  if (!value || isNaN(n)) return "Enter a valid amount";
  if (n <= 0) return "Amount must be greater than 0";
  return null;
}

export function formatCurrency(amount, currency = "RWF") {
  return `${Number(amount).toLocaleString("en-RW", { minimumFractionDigits: 0 })} ${currency}`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}
