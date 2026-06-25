import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { sendMoney } from "../api/transactionApi";
import { formatCurrency, validatePhone } from "../utils/validation";
import { CheckCircleIcon, RwandaFlagIcon } from "../components/Icons";

export default function SendMoneyPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [phoneLocal, setPhoneLocal] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState(null);   // null | { full_name, phone_number } | "not_found"
  const [lookupLoading, setLookupLoading] = useState(false);

  const digits = phoneLocal.replace(/\D/g, "");
  const fullPhone = phoneLocal.startsWith("+") ? phoneLocal : "+250" + digits;
  const parsedAmt = parseFloat(amount) || 0;
  const fee = parsedAmt * 0.005;
  const total = parsedAmt + fee;
  const ready = digits.length >= 9 && parsedAmt >= 1 && recipient && recipient !== "not_found";

  useEffect(() => {
    if (digits.length < 9) { setRecipient(null); return; }
    setLookupLoading(true);
    setRecipient(null);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/users/lookup?phone=${encodeURIComponent(fullPhone)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setRecipient(data);
        } else {
          setRecipient("not_found");
        }
      } catch {
        setRecipient("not_found");
      } finally {
        setLookupLoading(false);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [fullPhone, token, digits.length]);

  async function handleSubmit(e) {
    e.preventDefault();
    const pe = validatePhone(fullPhone);
    if (pe) { setError(pe); return; }
    if (parsedAmt < 1) { setError("Enter an amount to send."); return; }
    if (fullPhone === user?.phone_number) { setError("You cannot send money to yourself."); return; }
    setError(null);
    setLoading(true);
    try {
      const txn = await sendMoney(token, { recipient_phone: fullPhone, amount: parsedAmt });
      setSuccess(txn);
    } catch (err) {
      setError(err?.detail ?? "Transfer failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SidebarLayout>
        <div className="w-full min-h-full flex flex-col items-center justify-center py-16 px-6 text-center bg-slate-50 dark:bg-slate-900">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-5">
            <CheckCircleIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Transfer Sent!</h2>
          <p className="text-4xl font-black text-slate-900 dark:text-white mt-3">{formatCurrency(success.amount)}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">sent to {fullPhone}</p>
          {success.fee > 0 && <p className="text-xs text-slate-400 mt-1">Fee: {formatCurrency(success.fee)}</p>}
          <div className="flex flex-col gap-2 mt-8 w-full max-w-xs">
            <button onClick={() => navigate("/dashboard")}
              className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-colors">
              Back to Dashboard
            </button>
            <button onClick={() => { setSuccess(null); setPhoneLocal(""); setAmount(""); setError(null); setRecipient(null); }}
              className="w-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Send Again
            </button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">
        <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mb-5">
          ← Back to dashboard
        </Link>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Send money</h1>
        <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">Money lands in their wallet the moment you confirm.</p>

        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Recipient */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Recipient phone number
            </label>
            <div className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 transition-all">
              <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shrink-0">
                <RwandaFlagIcon className="w-5 h-3.5" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">+250</span>
              </div>
              <input
                type="tel"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
                placeholder="788 123 456"
                required
                className="flex-1 px-3 py-3 text-sm outline-none bg-white dark:bg-slate-800 dark:text-white"
              />
              {digits.length >= 9 && !lookupLoading && recipient && recipient !== "not_found" && (
                <div className="flex items-center pr-3 text-emerald-500">
                  <CheckCircleIcon className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* Recipient name feedback */}
            {digits.length >= 9 && (
              <div className="mt-3">
                {lookupLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
                    <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                    Looking up account…
                  </div>
                ) : recipient === "not_found" ? (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-3 py-2.5">
                    <span className="text-red-500 text-base leading-none">✕</span>
                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">No Ishimwe Bank account found for this number</span>
                  </div>
                ) : recipient ? (
                  <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">
                        {recipient.full_name ? recipient.full_name.trim().split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() : "?"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{recipient.full_name ?? "—"}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500">{recipient.phone_number}</p>
                    </div>
                    <CheckCircleIcon className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Amount
            </label>
            <div className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 transition-all">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                className="flex-1 px-4 py-3 text-2xl font-bold outline-none bg-white dark:bg-slate-800 dark:text-white"
              />
              <div className="flex items-center pr-4 text-slate-400 dark:text-slate-500 font-semibold text-sm shrink-0">
                RWF
              </div>
            </div>
          </div>

          {/* Summary */}
          {ready && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Amount to recipient</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(parsedAmt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Fee (0.5%)</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(fee)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-2 font-bold">
                <span className="text-slate-900 dark:text-white">Total deducted</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
          >
            {loading ? "Sending…" : ready ? `Send ${formatCurrency(parsedAmt)} →` : "Enter recipient and amount"}
          </button>
        </form>
      </div>
    </SidebarLayout>
  );
}
