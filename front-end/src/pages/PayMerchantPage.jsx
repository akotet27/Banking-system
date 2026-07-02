import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { payMerchant } from "../api/transactionApi";
import { login } from "../api/authApi";
import { getContacts, saveContact } from "../api/contactsApi";
import { formatCurrency } from "../utils/validation";
import { CheckCircleIcon, QrCodeIcon, StoreIcon, RwandaFlagIcon, EyeIcon, EyeOffIcon, LockIcon } from "../components/Icons";
import { API_BASE } from "../api/base.js";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

function MerchantChip({ contact, onSelect }) {
  const initials = contact.full_name
    ? contact.full_name.trim().split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <button
      type="button"
      onClick={() => onSelect(contact)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all shrink-0"
    >
      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
        <span className="text-white text-[9px] font-bold">{initials}</span>
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
        {contact.label ?? contact.full_name ?? contact.phone_number}
      </span>
    </button>
  );
}

export default function PayMerchantPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [merchantPhone, setMerchantPhone] = useState("");
  const [foundMerchant, setFoundMerchant] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);

  const parsedAmt = parseFloat(amount) || 0;
  const fullPhone = merchantPhone.startsWith("+") ? merchantPhone : "+250" + merchantPhone.replace(/\D/g, "");

  useEffect(() => {
    getContacts(token).then(setContacts).catch(() => {});
  }, [token]);

  const merchantContacts = contacts.filter(c => c.role === "merchant");

  function selectContact(contact) {
    const local = contact.phone_number.replace(/^\+250/, "");
    setMerchantPhone(local);
    setFoundMerchant(null);
    setContactSaved(true);
  }

  async function handleLookup() {
    if (merchantPhone.replace(/\D/g, "").length < 9) {
      setError("Enter a valid phone number.");
      return;
    }
    setError(null);
    setLookingUp(true);
    setContactSaved(false);
    try {
      const res = await fetch(`${API_BASE}/users/lookup?phone=${encodeURIComponent(fullPhone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      if (data.role !== "merchant") throw new Error("not a merchant");
      setFoundMerchant(data);
      setContactSaved(contacts.some(c => c.phone_number === data.phone_number));
    } catch {
      setFoundMerchant({ name: null, notFound: true });
      setError("No merchant found for that number. Make sure they are registered as a merchant.");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSaveContact() {
    if (!foundMerchant || foundMerchant.notFound) return;
    setSavingContact(true);
    try {
      await saveContact(token, foundMerchant.phone_number);
      setContacts(await getContacts(token));
      setContactSaved(true);
    } catch {
      // silently ignore
    } finally {
      setSavingContact(false);
    }
  }

  function handlePay() {
    if (!foundMerchant || foundMerchant.notFound) { setError("Look up a merchant first."); return; }
    if (parsedAmt < 1) { setError("Enter an amount."); return; }
    setError(null);
    setConfirmPassword("");
    setConfirmError(null);
    setConfirming(true);
  }

  async function handleConfirm(e) {
    e.preventDefault();
    if (!confirmPassword) { setConfirmError("Enter your password to confirm."); return; }
    setConfirmError(null);
    setConfirmLoading(true);
    try {
      await login(user.phone_number, confirmPassword);
    } catch {
      setConfirmError("Incorrect password. Please try again.");
      setConfirmLoading(false);
      return;
    }
    try {
      const txn = await payMerchant(token, { merchant_phone: fullPhone, amount: parsedAmt });
      setConfirming(false);
      setSuccess({ ...txn, merchantName: foundMerchant.full_name });
    } catch (err) {
      setConfirmError(err?.detail ?? "Payment failed.");
    } finally {
      setConfirmLoading(false);
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

        {/* Frequent merchant contacts */}
        {merchantContacts.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Recent merchants</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {merchantContacts.map(c => (
                <MerchantChip key={c.id} contact={c} onSelect={selectContact} />
              ))}
            </div>
          </div>
        )}

        {/* Merchant lookup */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
          {/* QR placeholder */}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-2xl p-8 flex flex-col items-center gap-2 mb-5">
            <div className="w-16 h-16 border-4 border-orange-400 rounded-lg flex items-center justify-center">
              <QrCodeIcon className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500">Point your camera at the merchant&apos;s till QR code</p>
            <p className="text-xs text-slate-300 dark:text-slate-600">— QR scanning available in mobile app —</p>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 font-medium">or enter manually</span>
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
                onChange={(e) => { setMerchantPhone(e.target.value); setFoundMerchant(null); setContactSaved(false); }}
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
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <CheckCircleIcon className="w-4 h-4" /> Verified
                </div>
                {contactSaved ? (
                  <span className="text-[10px] text-slate-400 font-medium">Saved</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    disabled={savingContact}
                    className="text-[10px] font-bold text-orange-500 hover:text-orange-600 disabled:opacity-50"
                  >
                    {savingContact ? "Saving…" : "+ Save"}
                  </button>
                )}
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
              <span className="font-bold text-emerald-600 dark:text-emerald-400">0.00 RWF — Free</span>
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

      {/* ── Confirmation overlay ── */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center shrink-0">
                <LockIcon className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Confirm payment</h3>
                <p className="text-xs text-slate-400">Enter your password to authorise</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">To</span>
                <span className="font-semibold text-slate-900 dark:text-white">{foundMerchant?.full_name ?? fullPhone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(parsedAmt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Fee</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between text-sm font-bold">
                <span className="text-slate-700 dark:text-slate-300">Total deducted</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(parsedAmt)}</span>
              </div>
            </div>

            {confirmError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-3 py-2.5 mb-4">
                {confirmError}
              </div>
            )}

            <form onSubmit={handleConfirm} className="space-y-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  autoFocus
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl pl-9 pr-10 py-3 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowConfirmPw(v => !v)}
                  aria-label={showConfirmPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>

              <button type="submit" disabled={confirmLoading}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {confirmLoading ? "Verifying…" : `Confirm & pay ${formatCurrency(parsedAmt)}`}
              </button>
              <button type="button"
                onClick={() => { setConfirming(false); setConfirmError(null); }}
                className="w-full text-sm text-slate-500 dark:text-slate-400 py-2 hover:text-slate-700 dark:hover:text-slate-200">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
