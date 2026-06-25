import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { cashIn } from "../api/transactionApi";
import { formatCurrency } from "../utils/validation";
import { CheckCircleIcon, InboxArrowDownIcon, RwandaFlagIcon } from "../components/Icons";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function CashInPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [phoneLocal, setPhoneLocal] = useState("");
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const fullPhone = phoneLocal.startsWith("+") ? phoneLocal : "+250" + phoneLocal.replace(/\D/g, "");
  const parsedAmt = parseFloat(amount) || 0;

  async function handleLookup() {
    if (phoneLocal.replace(/\D/g, "").length < 9) { setError("Enter a valid phone number."); return; }
    setError(null);
    setLookingUp(true);
    try {
      const res = await fetch(`http://localhost:8000/users/lookup?phone=${encodeURIComponent(fullPhone)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("ib_token")}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFoundCustomer(data);
    } catch {
      setFoundCustomer(null);
      setError("No customer found with that phone number.");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleCashIn() {
    if (parsedAmt < 1) { setError("Enter an amount."); return; }
    setError(null);
    setLoading(true);
    try {
      const txn = await cashIn(token, { customer_phone: fullPhone, amount: parsedAmt });
      setSuccess({ ...txn, customerName: foundCustomer?.full_name ?? fullPhone });
    } catch (err) {
      setError(err?.detail ?? "Cash in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center min-h-full py-20 text-center px-6 bg-slate-50 dark:bg-slate-900">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-5">
            <CheckCircleIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Cash In Complete</h2>
          <p className="text-4xl font-black text-slate-900 dark:text-white mt-3">{formatCurrency(success.amount)}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">credited to {success.customerName}</p>
          <div className="flex flex-col gap-2 mt-8 w-full max-w-xs">
            <button onClick={() => { setSuccess(null); setPhoneLocal(""); setFoundCustomer(null); setAmount(""); }}
              className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700">
              New Cash In
            </button>
            <button onClick={() => navigate("/agent")}
              className="w-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
              Back to Dashboard
            </button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">
        <Link to="/agent" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mb-5">
          &larr; Back to dashboard
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Process a cash in</h1>
        <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">Collect cash from the customer, then credit their wallet.</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {/* Customer lookup */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Customer's phone number</p>
          <div className="flex gap-2">
            <div className="flex flex-1 rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400 transition-all">
              <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shrink-0">
                <RwandaFlagIcon className="w-5 h-3.5" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">+250</span>
              </div>
              <input
                type="tel" value={phoneLocal}
                onChange={e => { setPhoneLocal(e.target.value); setFoundCustomer(null); }}
                onKeyDown={e => e.key === "Enter" && handleLookup()}
                placeholder="788 123 456"
                className="flex-1 px-3 py-3 text-sm font-semibold outline-none bg-white dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button type="button" onClick={handleLookup} disabled={lookingUp}
              className="bg-slate-900 dark:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-slate-700 disabled:opacity-50 text-sm shrink-0">
              {lookingUp ? "..." : "Find"}
            </button>
          </div>

          {foundCustomer && (
            <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">
                  {(foundCustomer.full_name ?? "?").split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{foundCustomer.full_name ?? fullPhone}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-xs font-medium ${foundCustomer.kyc_status === "verified" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                    {foundCustomer.kyc_status === "verified" ? "Verified customer" : "KYC pending"}
                  </span>
                  {foundCustomer.is_frozen
                    ? <span className="text-xs text-red-500">· Account frozen</span>
                    : <span className="text-xs text-slate-400 dark:text-slate-500">· No flags</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        {(foundCustomer || phoneLocal.replace(/\D/g, "").length >= 9) && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Amount received in cash</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_AMOUNTS.map(q => (
                <button key={q} type="button" onClick={() => setAmount(String(q))}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                    parsedAmt === q
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                      : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                  }`}>
                  {q >= 1000 ? `${q/1000}K` : q}
                </button>
              ))}
            </div>
            <div className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400 transition-all">
              <input
                type="number" min="1" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 px-4 py-3 text-2xl font-bold outline-none bg-white dark:bg-slate-800 dark:text-white"
              />
              <div className="flex items-center pr-4 text-slate-400 dark:text-slate-500 font-semibold text-sm shrink-0">RWF</div>
            </div>
          </div>
        )}

        {parsedAmt > 0 && phoneLocal.replace(/\D/g, "").length >= 9 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
              <InboxArrowDownIcon className="w-4 h-4 text-emerald-500 shrink-0" />
              Collect <strong className="text-slate-900 dark:text-white mx-1">{formatCurrency(parsedAmt)}</strong> cash from customer, then tap confirm.
            </div>
            <button type="button" onClick={handleCashIn} disabled={loading || foundCustomer?.is_frozen}
              className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {loading ? "Processing..." : `Confirm Credit of ${formatCurrency(parsedAmt)}`}
            </button>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
