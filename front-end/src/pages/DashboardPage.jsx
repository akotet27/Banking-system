import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { getBalance, getTransactions } from "../api/walletApi";
import { getPendingSessions, approveSessionSimple, declineSession } from "../api/sessionApi";
import { formatCurrency, timeAgo } from "../utils/validation";
import {
  SendIcon, ArrowDownIcon, StoreIcon, InboxArrowDownIcon,
  ExclamationIcon, ClockIcon, BankNoteIcon, EyeIcon, EyeOffIcon,
} from "../components/Icons";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const TYPE_STYLES = {
  send:         { color: "bg-orange-100", text: "text-orange-600", Icon: SendIcon,        label: "Sent" },
  receive:      { color: "bg-emerald-100", text: "text-emerald-600", Icon: InboxArrowDownIcon, label: "Received" },
  cash_in:      { color: "bg-blue-100",   text: "text-blue-600",   Icon: ArrowDownIcon,   label: "Cash In" },
  cash_out:     { color: "bg-red-100",    text: "text-red-600",    Icon: BankNoteIcon,    label: "Cash Out" },
  pay_merchant: { color: "bg-purple-100", text: "text-purple-600", Icon: StoreIcon,       label: "Payment" },
};

function txStyle(t, userId) {
  if (t.transaction_type === "send") return t.sender_id === userId ? TYPE_STYLES.send : TYPE_STYLES.receive;
  return TYPE_STYLES[t.transaction_type] ?? TYPE_STYLES.send;
}

function txLabel(t, userId) {
  if (t.transaction_type === "send") {
    return t.sender_id === userId ? `Sent to ${t.recipient_phone ?? "recipient"}` : `Received from ${t.sender_phone ?? "sender"}`;
  }
  if (t.transaction_type === "cash_in")  return "Cash in via agent";
  if (t.transaction_type === "cash_out") return "Cash out via agent";
  if (t.transaction_type === "pay_merchant") return `Paid merchant`;
  return t.transaction_type;
}

function isDebit(t, userId) {
  if (t.transaction_type === "send") return t.sender_id === userId;
  return t.transaction_type === "cash_out" || t.transaction_type === "pay_merchant";
}


export default function DashboardPage() {
  const { user, token } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [kycStatus, setKycStatus] = useState(null);
  const [pendingSessions, setPendingSessions] = useState([]);
  const [sessionActionLoading, setSessionActionLoading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balanceHidden, setBalanceHidden] = useState(false);

  useEffect(() => {
    const kycFetch = fetch("http://localhost:8000/kyc/my-status", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).catch(() => null);
    const sessionsFetch = user?.role === "customer"
      ? getPendingSessions(token).catch(() => [])
      : Promise.resolve([]);
    Promise.all([getBalance(token), getTransactions(token, 5), kycFetch, sessionsFetch])
      .then(([b, txns, kyc, sessions]) => {
        setWallet(b);
        setTransactions(txns ?? []);
        if (kyc) setKycStatus(kyc);
        setPendingSessions(sessions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  async function handleApprove(id) {
    setSessionActionLoading(id + "_a");
    try { await approveSessionSimple(token, id); setPendingSessions((p) => p.filter((s) => s.session_id !== id)); }
    catch { } finally { setSessionActionLoading(null); }
  }
  async function handleDecline(id) {
    setSessionActionLoading(id + "_d");
    try { await declineSession(token, id); setPendingSessions((p) => p.filter((s) => s.session_id !== id)); }
    catch { } finally { setSessionActionLoading(null); }
  }

  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const bal = wallet?.balance ?? 0;

  const QUICK = [
    { label: "Send",     to: "/send",      Icon: SendIcon },
    { label: "Cash in",  to: "/dashboard", Icon: InboxArrowDownIcon },
    { label: "Cash out", to: "/dashboard", Icon: ArrowDownIcon },
    { label: "Pay",      to: "/pay",       Icon: StoreIcon },
  ];

  return (
    <SidebarLayout>
      <div className="px-4 md:px-8 py-6 md:py-7 space-y-5 w-full bg-slate-50 dark:bg-slate-900 min-h-full">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{greeting()}, {firstName}</h1>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">Here&apos;s what&apos;s happening with your account today.</p>
          </div>
        </div>

        {/* Balance card */}
        <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #0B1D3E 0%, #1B4FD8 100%)" }}>
          {loading ? (
            <div className="h-16 flex items-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div>
              <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-2">Available balance</p>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white">
                      {balanceHidden ? "••••••" : new Intl.NumberFormat("en-RW").format(bal)}
                    </span>
                    <span className="text-white/60 font-bold mb-1">.00 RWF</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-white/10 text-white/80 text-xs font-medium px-3 py-1 rounded-full">
                      {user?.phone_number}
                    </span>
                    <button
                      onClick={() => setBalanceHidden((v) => !v)}
                      className="text-white/50 hover:text-white"
                    >
                      {balanceHidden
                        ? <EyeIcon className="w-4 h-4" />
                        : <EyeOffIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick actions row */}
        <div className="grid grid-cols-4 gap-3">
          {QUICK.map(({ label, to, Icon }) => (
            <Link key={label} to={to}
              className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-orange-200 dark:hover:border-orange-700 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                <Icon className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
            </Link>
          ))}
        </div>

        {/* Pending cash-out approvals */}
        {pendingSessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Cash-Out Requests</h2>
            {pendingSessions.map((s) => {
              const secsLeft = Math.max(0, Math.floor((new Date(s.expires_at) - Date.now()) / 1000));
              return (
                <div key={s.session_id} className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Cash-Out Request</p>
                      <p className="text-2xl font-extrabold text-slate-900">{formatCurrency(s.amount)}</p>
                    </div>
                    <span className={`text-sm font-bold ${secsLeft < 60 ? "text-red-600" : "text-amber-600"}`}>
                      {Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, "0")} left
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">An agent is waiting. Only approve if you are physically at their counter.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleDecline(s.session_id)} disabled={!!sessionActionLoading}
                      className="py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                      {sessionActionLoading === s.session_id + "_d" ? "Declining…" : "Decline"}
                    </button>
                    <button onClick={() => handleApprove(s.session_id)} disabled={!!sessionActionLoading}
                      className="py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                      {sessionActionLoading === s.session_id + "_a" ? "Approving…" : "Approve"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* KYC banner — only show when not verified */}
        {user?.kyc_status !== "verified" && (
          kycStatus?.request_status === "pending" ? (
            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3">
              <ClockIcon className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">Identity verification is under review.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <ExclamationIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">Complete identity verification to unlock higher limits.</p>
              </div>
              <Link to="/kyc" className="text-xs text-orange-500 font-bold hover:underline shrink-0">Verify →</Link>
            </div>
          )
        )}

        {/* Recent transactions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white">Recent transactions</h2>
            <Link to="/history" className="text-xs text-orange-500 font-semibold hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="px-5 pb-5 space-y-3">
              {[0,1,2].map((i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="px-5 pb-5 text-slate-400 text-sm">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {transactions.map((t) => {
                const s = txStyle(t, user?.id);
                const debit = isDebit(t, user?.id);
                return (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className={`w-9 h-9 ${s.color} ${s.text} rounded-xl flex items-center justify-center shrink-0`}>
                      <s.Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{txLabel(t, user?.id)}</p>
                      <p className="text-xs text-slate-400">{timeAgo(t.created_at)} · {s.label}</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${debit ? "text-red-500" : "text-emerald-600"}`}>
                      {debit ? "−" : "+"}{formatCurrency(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
