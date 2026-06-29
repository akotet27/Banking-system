import { useState } from "react";
import { beginApproval, approveSession, approveSessionSimple } from "../api/sessionApi";
import { listCredentials } from "../api/biometricApi";
import { prepareGetOptions, assertionToJSON } from "../utils/webauthn";
import { useAuth } from "../contexts/AuthContext";
import { FingerprintIcon } from "./Icons";

export default function BiometricPrompt({ sessionId, amount, onApproved, onCancel }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null); // "fingerprint" | "fallback" | null

  async function handleApprove() {
    setLoading(true);
    setError(null);

    try {
      let approved = false;

      // Try biometric approval if credentials are enrolled
      try {
        const creds = await listCredentials(token);
        if (creds.length > 0) {
          setStatus("fingerprint");
          const options = await beginApproval(token, sessionId);
          if (options._dev_mode) {
            await approveSession(token, sessionId, "phone_webauthn", null);
          } else {
            const assertion = await navigator.credentials.get({
              publicKey: prepareGetOptions(options),
            });
            await approveSession(token, sessionId, "phone_webauthn", assertionToJSON(assertion));
          }
          approved = true;
        }
      } catch {
        // No credentials, user cancelled WebAuthn, or device not supported
      }

      // Fall back to simple web approval
      if (!approved) {
        setStatus("fallback");
        await approveSessionSimple(token, sessionId);
      }

      onApproved?.();
    } catch (err) {
      setError(err?.detail ?? err?.message ?? "Approval failed. Please try again.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  const statusMsg = status === "fingerprint"
    ? "Touch your fingerprint sensor…"
    : status === "fallback"
    ? "Approving…"
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
            {loading && status === "fingerprint"
              ? <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              : <FingerprintIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            }
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Approve Cash Out</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Amount: <span className="font-semibold text-slate-900 dark:text-white">{amount} RWF</span>
          </p>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-5">
          {statusMsg ?? "Confirm this withdrawal. Your balance is never revealed to the agent — only a yes/no approval."}
        </p>

        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <FingerprintIcon className="w-4 h-4" />
            }
            {loading ? (statusMsg ?? "Approving…") : "Approve"}
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
          Only approve if you are physically at this agent&apos;s counter.
        </p>
      </div>
    </div>
  );
}
