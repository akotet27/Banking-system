/**
 * Renders a biometric approval prompt for the customer.
 * In a real deployment this would trigger navigator.credentials.get()
 * (WebAuthn) on the customer's phone. For now it renders a UI that
 * calls the /sessions/{id}/approve endpoint directly (dev mode where
 * py-webauthn auto-approves when no real credential response is sent).
 */
import { useState } from "react";
import { approveSession } from "../api/sessionApi";
import { useAuth } from "../contexts/AuthContext";

export default function BiometricPrompt({ sessionId, amount, onApproved, onCancel }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      await approveSession(token, sessionId, "phone_webauthn", null);
      onApproved?.();
    } catch (err) {
      setError(err?.detail ?? "Approval failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-gray-900">Approve Cash Out</h2>
          <p className="text-gray-500 mt-1">
            Amount: <span className="font-semibold text-gray-900">{amount} RWF</span>
          </p>
        </div>

        <p className="text-sm text-gray-500 text-center mb-5">
          Confirm with your fingerprint to authorise this withdrawal. Your balance
          is never shown to the agent — only a yes/no sufficient-funds answer.
        </p>

        {error && (
          <p className="text-red-600 text-sm text-center mb-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
