import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { confirmCashOut, initiateCashOut } from "../api/transactionApi";
import { getSessionStatus } from "../api/sessionApi";
import { formatCurrency } from "../utils/validation";
import { CheckCircleIcon, BankNoteIcon, ClockIcon, ShieldCheckIcon, RwandaFlagIcon } from "../components/Icons";

const POLL_MS = 3000;
const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function CashOutPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("form");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [amount, setAmount] = useState("");
  const [session, setSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const fullPhone = phoneLocal.startsWith("+") ? phoneLocal : "+250" + phoneLocal.replace(/\D/g, "");
  const parsedAmt = parseFloat(amount) || 0;

  useEffect(() => () => clearInterval(pollRef.current), []);

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

  async function handleInitiate() {
    if (parsedAmt < 1) { setError("Enter an amount."); return; }
    setError(null);
    setLoading(true);
    try {
      const s = await initiateCashOut(token, { customer_phone: fullPhone, amount: parsedAmt });
      setSession(s);
      setStep("waiting");
      pollRef.current = setInterval(async () => {
        try {
          const status = await getSessionStatus(token, s.session_id);
          setSessionStatus(status);
          if (status.status === "approved") { clearInterval(pollRef.current); setStep("ready"); }
          if (status.status === "declined") { clearInterval(pollRef.current); setError("Customer declined this cash-out request."); setStep("form"); }
          if (status.status === "expired")  { clearInterval(pollRef.current); setError("Session expired. Please start again."); setStep("form"); }
        } catch { /* poll quietly */ }
      }, POLL_MS);
    } catch (err) {
      setError(err?.detail ?? "Failed to initiate cash out.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      const txn = await confirmCashOut(token, session.session_id);
      setResult(txn);
      setStep("done");
    } catch (err) {
      setError(err?.detail ?? "Confirmation failed.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    clearInterval(pollRef.current);
    setStep("form"); setSession(null); setSessionStatus(null); setResult(null);
    setError(null); setAmount(""); setFoundCustomer(null); setPhoneLocal("");
  }

  /* DONE */
  if (step === "done") {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center min-h-full py-20 text-center px-6 bg-slate-50 dark:bg-slate-900">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-5">
            <CheckCircleIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Cash Out Complete</h2>
          <p className="text-4xl font-black text-slate-900 dark:text-white mt-3">{formatCurrency(result?.amount)}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">handed over to customer</p>
          <div className="flex flex-col gap-2 mt-8 w-full max-w-xs">
            <button onClick={reset} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600">
              New Cash Out
            </button>
            <button onClick={() => navigate("/agent")} className="w-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
              Back to Dashboard
            </button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  /* READY - customer approved */
  if (step === "ready") {
    const sufficient = sessionStatus?.sufficient_balance;
    return (
      <SidebarLayout>
        <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Cash out approved</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">Customer confirmed - hand over cash to complete.</p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">
                    {(foundCustomer?.full_name ?? "?").split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{fullPhone}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{foundCustomer?.full_name ?? "Customer"}</p>
                </div>
              </div>
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">Approved</span>
            </div>

            <div className="text-center py-4">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Customer wants to withdraw</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white">{formatCurrency(parsedAmt)}</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">You will hand over {formatCurrency(parsedAmt)} in cash</p>
            </div>

            <div className={`rounded-2xl p-5 text-center border ${sufficient ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"}`}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Sufficient balance</p>
              <p className={`text-5xl font-black ${sufficient ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{sufficient ? "YES" : "NO"}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Actual balance is never shown to agents - privacy protection.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">What this session shows you</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Customer's actual balance</span><span className="text-slate-400 dark:text-slate-500 italic">Never shown</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Sufficient balance for this amount</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">Yes / No - shown</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Transaction history</span><span className="text-slate-400 dark:text-slate-500 italic">Never shown</span></div>
              </div>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
            {sufficient ? (
              <button onClick={handleConfirm} disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {loading ? "Processing..." : "Confirm - Hand Over Cash"}
              </button>
            ) : (
              <div className="text-center text-sm text-red-600 dark:text-red-400 font-semibold">Cannot complete - customer has insufficient balance.</div>
            )}
            <button onClick={reset} className="w-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  /* WAITING */
  if (step === "waiting") {
    return (
      <SidebarLayout>
        <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Cash out request</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">Waiting for the customer to approve on their own device.</p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">
                    {(foundCustomer?.full_name ?? "?").split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{fullPhone}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{foundCustomer?.full_name ?? "Customer"}{foundCustomer?.kyc_status === "verified" ? " · Verified" : ""}</p>
                </div>
              </div>
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full">Awaiting approval</span>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Customer wants to withdraw</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white">{formatCurrency(parsedAmt)}</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">You will hand over {formatCurrency(parsedAmt)} in cash</p>
            </div>

            <div className="rounded-2xl p-8 text-center" style={{ background: "linear-gradient(135deg, #0B1D3E 0%, #1B3A8A 100%)" }}>
              <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-white font-bold mb-2">Waiting for approval</p>
              <p className="text-slate-300 text-sm">The customer is confirming this request on their own phone. You will see the result the instant they respond - nothing more, nothing less.</p>
              <div className="flex items-center justify-center gap-1.5 mt-4 text-slate-400 text-xs">
                <ClockIcon className="w-3.5 h-3.5" />
                Session #<span className="font-mono">{session?.session_id}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheckIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">What this session shows you</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Customer's actual balance</span><span className="text-slate-400 dark:text-slate-500 italic">Never shown</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Sufficient balance for this amount</span><span className="font-semibold text-slate-700 dark:text-slate-300">Yes / No - once approved</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Transaction history</span><span className="text-slate-400 dark:text-slate-500 italic">Never shown</span></div>
              </div>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
            <button className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-medium py-3.5 rounded-xl cursor-not-allowed" disabled>
              <ClockIcon className="w-4 h-4" /> Waiting for customer approval
            </button>
            <button onClick={reset} className="w-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
              Cancel session
            </button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  /* FORM */
  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">
        <Link to="/agent" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mb-5">
          &larr; Back to dashboard
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Process cash out</h1>
        <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">Withdraw cash for a customer. They will approve on their own device.</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {/* Customer lookup */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Customer's phone number</p>
          <div className="flex gap-2">
            <div className="flex flex-1 rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 transition-all">
              <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shrink-0">
                <RwandaFlagIcon className="w-5 h-3.5" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">+250</span>
              </div>
              <input type="tel" value={phoneLocal}
                onChange={e => { setPhoneLocal(e.target.value); setFoundCustomer(null); }}
                onKeyDown={e => e.key === "Enter" && handleLookup()}
                placeholder="788 123 456"
                className="flex-1 px-3 py-3 text-sm font-semibold outline-none bg-white dark:bg-slate-800 dark:text-white" />
            </div>
            <button type="button" onClick={handleLookup} disabled={lookingUp}
              className="bg-slate-900 dark:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-slate-700 disabled:opacity-50 text-sm shrink-0">
              {lookingUp ? "..." : "Find"}
            </button>
          </div>
          {foundCustomer && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">
                  {(foundCustomer.full_name ?? "?").split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{foundCustomer.full_name ?? fullPhone}</p>
                <p className={`text-xs font-medium mt-0.5 ${foundCustomer.kyc_status === "verified" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                  {foundCustomer.kyc_status === "verified" ? "Verified customer" : "KYC pending"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        {(foundCustomer || phoneLocal.replace(/\D/g, "").length >= 9) && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Withdrawal amount</p>
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
            <div className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 transition-all">
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
              <BankNoteIcon className="w-4 h-4 text-orange-500 shrink-0" />
              Customer will approve on their phone. Do not hand over cash until approved.
            </div>
            <button type="button" onClick={handleInitiate} disabled={loading}
              className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {loading ? "Creating session..." : `Start Cash Out`}
            </button>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
