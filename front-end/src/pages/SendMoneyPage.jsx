import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { sendMoney } from "../api/transactionApi";
import { login } from "../api/authApi";
import { getContacts, saveContact } from "../api/contactsApi";
import { listCredentials, authenticateBegin, authenticateFinish } from "../api/biometricApi";
import { prepareGetOptions, assertionToJSON } from "../utils/webauthn";
import { formatCurrency, validatePhone } from "../utils/validation";
import { CheckCircleIcon, RwandaFlagIcon, LockIcon, EyeIcon, EyeOffIcon, FingerprintIcon } from "../components/Icons";
import { API_BASE } from "../api/base.js";

function ContactChip({ contact, onSelect }) {
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

export default function SendMoneyPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [phoneLocal, setPhoneLocal] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const [hasBiometric, setHasBiometric] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState(null);

  const digits = phoneLocal.replace(/\D/g, "");
  const fullPhone = phoneLocal.startsWith("+") ? phoneLocal : "+250" + digits;
  const parsedAmt = parseFloat(amount) || 0;
  const fee = parsedAmt * 0.005;
  const total = parsedAmt + fee;
  const ready = digits.length >= 9 && parsedAmt >= 1 && recipient && recipient !== "not_found";

  const suggestions = digits.length > 0 && digits.length < 9
    ? contacts.filter(c => c.role !== "merchant" && c.phone_number.replace(/\D/g, "").includes(digits))
    : [];

  useEffect(() => {
    getContacts(token).then(setContacts).catch(() => {});
    listCredentials(token).then(creds => setHasBiometric(creds.length > 0)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (digits.length < 9) { setRecipient(null); setContactSaved(false); return; }
    setLookupLoading(true);
    setRecipient(null);
    setContactSaved(false);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/users/lookup?phone=${encodeURIComponent(fullPhone)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setRecipient(data);
          setContactSaved(contacts.some(c => c.phone_number === data.phone_number));
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

  function selectContact(contact) {
    const local = contact.phone_number.replace(/^\+250/, "");
    setPhoneLocal(local);
    setSuggestOpen(false);
  }

  async function handleSaveContact() {
    if (!recipient || recipient === "not_found") return;
    setSavingContact(true);
    try {
      await saveContact(token, recipient.phone_number);
      setContacts(await getContacts(token));
      setContactSaved(true);
    } catch {
      // silently ignore duplicate
    } finally {
      setSavingContact(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const pe = validatePhone(fullPhone);
    if (pe) { setError(pe); return; }
    if (parsedAmt < 1) { setError("Enter an amount to send."); return; }
    if (fullPhone === user?.phone_number) { setError("You cannot send money to yourself."); return; }
    setError(null);
    setConfirmPassword("");
    setConfirmError(null);
    setBioError(null);
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
      const txn = await sendMoney(token, { recipient_phone: fullPhone, amount: parsedAmt });
      setConfirming(false);
      setSuccess(txn);
    } catch (err) {
      setConfirmError(err?.detail ?? "Transfer failed. Please try again.");
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleBiometricConfirm() {
    setBioError(null);
    setBioLoading(true);
    try {
      const options = await authenticateBegin(token);
      if (options._dev_mode) {
        await authenticateFinish(token, null);
      } else {
        const assertion = await navigator.credentials.get({ publicKey: prepareGetOptions(options) });
        await authenticateFinish(token, assertionToJSON(assertion));
      }
      const txn = await sendMoney(token, { recipient_phone: fullPhone, amount: parsedAmt });
      setConfirming(false);
      setSuccess(txn);
    } catch (err) {
      setBioError(err?.detail ?? err?.message ?? "Fingerprint verification failed. Use your password instead.");
    } finally {
      setBioLoading(false);
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
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">sent to {recipient?.full_name ?? fullPhone}</p>
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

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Frequent contacts (exclude merchants — use Pay Merchant for those) */}
          {contacts.filter(c => c.role !== "merchant").length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Frequent contacts</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {contacts.filter(c => c.role !== "merchant").map(c => (
                  <ContactChip key={c.id} contact={c} onSelect={selectContact} />
                ))}
              </div>
            </div>
          )}

          {/* Recipient */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Recipient phone number
            </label>
            <div className="relative">
              <div className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 transition-all">
                <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shrink-0">
                  <RwandaFlagIcon className="w-5 h-3.5" />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">+250</span>
                </div>
                <input
                  type="tel"
                  value={phoneLocal}
                  onChange={(e) => { setPhoneLocal(e.target.value); setSuggestOpen(true); }}
                  onFocus={() => setSuggestOpen(true)}
                  onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
                  placeholder="788 123 456"
                  required
                  autoComplete="off"
                  className="flex-1 px-3 py-3 text-sm outline-none bg-white dark:bg-slate-800 dark:text-white"
                />
                {digits.length >= 9 && !lookupLoading && recipient && recipient !== "not_found" && (
                  <div className="flex items-center pr-3 text-emerald-500">
                    <CheckCircleIcon className="w-5 h-5" />
                  </div>
                )}
              </div>

              {suggestOpen && suggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectContact(c)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">
                          {(c.full_name ?? c.label ?? "?").trim().split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{c.label ?? c.full_name ?? c.phone_number}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{c.phone_number}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{recipient.full_name ?? "—"}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500">{recipient.phone_number}</p>
                    </div>
                    {contactSaved ? (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Saved</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveContact}
                        disabled={savingContact}
                        className="text-xs font-bold text-orange-500 hover:text-orange-600 disabled:opacity-50 shrink-0"
                      >
                        {savingContact ? "Saving…" : "+ Save"}
                      </button>
                    )}
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

      {/* ── Confirmation overlay ── */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center shrink-0">
                <LockIcon className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Confirm transfer</h3>
                <p className="text-xs text-slate-400">{hasBiometric ? "Use your fingerprint or password to authorise" : "Enter your password to authorise"}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Recipient</span>
                <span className="font-semibold text-slate-900 dark:text-white">{recipient?.full_name ?? fullPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(parsedAmt)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2 font-bold">
                <span className="text-slate-900 dark:text-white">Total</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
            </div>

            {bioError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-3 py-2 mb-3">{bioError}</div>
            )}

            {hasBiometric && (
              <>
                <button
                  type="button"
                  onClick={handleBiometricConfirm}
                  disabled={bioLoading || confirmLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm mb-3"
                >
                  {bioLoading
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <FingerprintIcon className="w-4 h-4" />}
                  {bioLoading ? "Waiting for fingerprint…" : "Confirm with fingerprint"}
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">or use password</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>
              </>
            )}

            {confirmError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-3 py-2 mb-3">{confirmError}</div>
            )}

            <form onSubmit={handleConfirm} className="space-y-3">
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Your password"
                  autoFocus
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                  aria-label={showConfirmPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirming(false)} disabled={confirmLoading}
                  className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-sm disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={confirmLoading}
                  className="flex-1 bg-orange-500 text-white font-bold py-2.5 rounded-xl hover:bg-orange-600 disabled:opacity-50 text-sm">
                  {confirmLoading ? "Sending…" : "Confirm →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
