import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { payMerchant } from "../api/transactionApi";
import { formatCurrency } from "../utils/validation";
import { CheckCircleIcon, QrCodeIcon, StoreIcon, RwandaFlagIcon } from "../components/Icons";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function PayMerchantPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [merchantPhone, setMerchantPhone] = useState("");
  const [foundMerchant, setFoundMerchant] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const parsedAmt = parseFloat(amount) || 0;
  const fullPhone = merchantPhone.startsWith("+") ? merchantPhone : "+250" + merchantPhone.replace(/\D/g, "");

  async function handleLookup() {
    if (merchantPhone.replace(/\D/g, "").length < 9) {
      setError("Enter a valid phone number.");
      return;
    }
    setError(null);
    setLookingUp(true);
    try {
      const res = await fetch(`http://localhost:8000/users/lookup?phone=${encodeURIComponent(fullPhone)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("ib_token")}` },
      });
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      if (data.role !== "merchant") throw new Error("not a merchant");
      setFoundMerchant(data);
    } catch {
      setFoundMerchant({ name: null, notFound: true });
      setError("No merchant found for that number. Make sure they are registered as a merchant.");
    } finally {
      setLookingUp(false);
    }
  }

  async function handlePay() {
    if (!foundMerchant || foundMerchant.notFound) { setError("Look up a merchant first."); return; }
    if (parsedAmt < 1) { setError("Enter an amount."); return; }
    setError(null);
    setLoading(true);
    try {
      const txn = await payMerchant(token, { merchant_phone: fullPhone, amount: parsedAmt });
      setSuccess({ ...txn, merchantName: foundMerchant.full_name });
    } catch (err) {
      setError(err?.detail ?? "Payment failed.");
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
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Payment Sent!</h2>
          <p className="text-4xl font-black text-slate-900 dark:text-white mt-3">{formatCurrency(success.amount)}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">paid to {success.merchantName ?? fullPhone}</p>
          <div className="flex flex-col gap-2 mt-8 w-full max-w-xs">
            <button onClick={() => navigate("/dashboard")}
              className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600">
              Back to Dashboard
            </button>
            <button onClick={() => { setSuccess(null); setMerchantPhone(""); setFoundMerchant(null); setAmount(""); }}
              className="w-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
              Pay Another Merchant
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
          &larr; Back to dashboard
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Pay a merchant</h1>
        <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">Scan a till QR code, or enter their merchant number directly.</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {/* Merchant lookup */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
          {/* QR placeholder */}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-2xl p-8 flex flex-col items-center gap-2 mb-5">
            <div className="w-16 h-16 border-4 border-orange-400 rounded-lg flex items-center justify-center">
              <QrCodeIcon className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500">Point your camera at the merchant&apos;s till QR code</p>
            <p className="text-xs text-slate-300 dark:text-slate-600">- QR scanning available in mobile app -</p>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 font-medium">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Phone input */}
          <div className="flex gap-2">
            <div className="flex flex-1 rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 transition-all">
              <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shrink-0">
                <RwandaFlagIcon className="w-5 h-3.5" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">+250</span>
              </div>
              <input
                type="tel" value={merchantPhone}
                onChange={(e) => { setMerchantPhone(e.target.value); setFoundMerchant(null); }}
                onKeyDown={e => e.key === "Enter" && handleLookup()}
                placeholder="Merchant phone number"
                className="flex-1 px-3 py-3 text-sm outline-none bg-white dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="button" onClick={handleLookup} disabled={lookingUp}
              className="bg-slate-900 dark:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-slate-700 disabled:opacity-50 text-sm shrink-0"
            >
              {lookingUp ? "..." : "Look up"}
            </button>
          </div>

          {/* Merchant found */}
          {foundMerchant && !foundMerchant.notFound && (
            <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
                <StoreIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{foundMerchant.full_name ?? fullPhone}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{fullPhone}</p>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircleIcon className="w-4 h-4" /> Verified
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        {foundMerchant && !foundMerchant.notFound && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Amount</p>
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

        {/* Summary */}
        {foundMerchant && !foundMerchant.notFound && parsedAmt > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500 dark:text-slate-400">Amount to {foundMerchant.full_name ?? "merchant"}</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(parsedAmt)}</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span className="text-slate-500 dark:text-slate-400">Your fee</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">0.00 RWF - Free for you</span>
            </div>
            <button
              type="button" onClick={handlePay} disabled={loading}
              className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? "Processing..." : `Pay ${formatCurrency(parsedAmt)}`}
            </button>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
