import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { getBalance, getTransactions, floatTopup, getFloatRequests } from "../api/walletApi";
import { formatCurrency } from "../utils/validation";
import { InboxArrowDownIcon, BankNoteIcon, ArrowUpIcon, ArrowDownIcon, XIcon } from "../components/Icons";
import AccessCodeCard from "../components/AccessCodeCard";

export default function AgentDashboardPage() {
  const { user, token } = useAuth();
  const [wallet, setWallet]             = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showTopup, setShowTopup]       = useState(false);
  const [topupAmount, setTopupAmount]   = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupMsg, setTopupMsg]         = useState(null);
  const [floatRequests, setFloatRequests] = useState([]);
  const [txPage, setTxPage]               = useState(0);

  const TX_PAGE_SIZE = 8;

  function loadData() {
    setLoading(true);
    Promise.all([getBalance(token), getTransactions(token, 20), getFloatRequests(token)])
      .then(([b, txns, reqs]) => {
        setWallet(b);
        setTransactions(txns ?? []);
        setFloatRequests(reqs ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [token]);

  async function handleTopup(e) {
    e.preventDefault();
    const amt = parseFloat(topupAmount);
    if (!amt || amt <= 0) { setTopupMsg({ ok: false, text: "Enter a positive amount." }); return; }
    setTopupLoading(true);
    try {
      const res = await floatTopup(token, amt);
      setTopupMsg({ ok: true, text: res.message ?? "Request submitted. Waiting for admin approval." });
      setTopupAmount("");
      setShowTopup(false);
      loadData();
    } catch (err) {
      setTopupMsg({ ok: false, text: err?.detail ?? "Request failed." });
    } finally {
      setTopupLoading(false);
    }
  }

  const firstName    = user?.full_name?.split(" ")[0] ?? "Agent";
  const floatBal     = wallet?.float_balance ?? 0;
  const FLOAT_LIMIT  = 500_000;
  const floatPct     = Math.min((floatBal / FLOAT_LIMIT) * 100, 100);
  const hasPending   = floatRequests.some(r => r.status === "pending");

  const cashInToday  = transactions.filter(t => t.type === "cash_in").length;
  const cashOutToday = transactions.filter(t => t.type === "cash_out").length;

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  const STATS = [
    {
      label: "Float balance",
      value: loading ? "—" : new Intl.NumberFormat("en-RW").format(floatBal),
      unit: "RWF",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Cash in today",
      value: cashInToday,
      unit: cashInToday === 1 ? "deposit" : "deposits",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Cash out today",
      value: cashOutToday,
      unit: cashOutToday === 1 ? "withdrawal" : "withdrawals",
      color: "text-orange-500 dark:text-orange-400",
    },
  ];

  return (
    <SidebarLayout>
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 px-4 md:px-8 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {greeting()}, {firstName}
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
              {cashInToday + cashOutToday} transactions processed today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/cash-in"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              <ArrowUpIcon className="w-4 h-4" /> Cash In
            </Link>
            <Link to="/cashout"
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              <ArrowDownIcon className="w-4 h-4" /> Cash Out
            </Link>
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-2 rounded-xl">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              Active
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">{s.label}</p>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{s.unit}</p>
            </div>
          ))}
        </div>

        {/* ── Main: activity + float ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Recent activity — takes 2/3 */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Recent activity</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">{transactions.length} transactions</span>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                No transactions yet.
              </div>
            ) : (() => {
                const totalPages = Math.ceil(transactions.length / TX_PAGE_SIZE);
                const pageSlice  = transactions.slice(txPage * TX_PAGE_SIZE, (txPage + 1) * TX_PAGE_SIZE);
                const from = txPage * TX_PAGE_SIZE + 1;
                const to   = Math.min((txPage + 1) * TX_PAGE_SIZE, transactions.length);
                return (
                  <>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {pageSlice.map(t => {
                        const isIn  = t.type === "cash_in";
                        const dt    = new Date(t.created_at);
                        const date  = dt.toLocaleDateString("en-RW", { day: "2-digit", month: "short" });
                        const time  = dt.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" });
                        const phone = t.counterparty_phone ?? "";
                        return (
                          <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isIn
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400"
                            }`}>
                              {isIn
                                ? <InboxArrowDownIcon className="w-4 h-4" />
                                : <BankNoteIcon className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {isIn ? "Cash In" : "Cash Out"}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                {phone || "—"} · {date}, {time}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-bold ${isIn ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                {isIn ? "+" : "-"}{formatCurrency(t.amount)}
                              </p>
                              {parseFloat(t.fee) > 0 && (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">fee {formatCurrency(t.fee)}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {from}–{to} of {transactions.length} · page {txPage + 1} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTxPage(p => Math.max(0, p - 1))}
                            disabled={txPage === 0}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            ← Prev
                          </button>
                          <button
                            onClick={() => setTxPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={txPage >= totalPages - 1}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
          </div>

          {/* Float management — takes 1/3 */}
          <div className="space-y-4">

            {/* Float card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Float balance</h3>

              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-0.5">
                {new Intl.NumberFormat("en-RW").format(floatBal)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">RWF available</p>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mb-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${floatPct > 80 ? "bg-blue-500" : floatPct > 40 ? "bg-emerald-500" : "bg-orange-400"}`}
                  style={{ width: `${floatPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-5">
                <span>{Math.round(floatPct)}% used</span>
                <span>Limit: {new Intl.NumberFormat("en-RW").format(FLOAT_LIMIT)}</span>
              </div>

              {/* Pending banner */}
              {hasPending && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2.5 mb-3 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0" />
                  Float request pending approval
                </div>
              )}

              {/* Success / error message */}
              {topupMsg && (
                <div className={`text-xs rounded-xl px-3 py-2.5 mb-3 font-medium border ${
                  topupMsg.ok
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700"
                }`}>
                  {topupMsg.text}
                </div>
              )}

              {/* Top-up button or disabled state */}
              {hasPending ? (
                <div className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-semibold py-2.5 rounded-xl text-sm cursor-not-allowed">
                  <ArrowUpIcon className="w-4 h-4" /> Request pending…
                </div>
              ) : (
                <button
                  onClick={() => { setShowTopup(v => !v); setTopupMsg(null); }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  <ArrowUpIcon className="w-4 h-4" /> Request top-up
                </button>
              )}

              {/* Top-up form */}
              {showTopup && !hasPending && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Admin must approve before funds are added</p>
                    <button onClick={() => setShowTopup(false)} className="text-slate-400 hover:text-slate-600">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleTopup} className="flex gap-2">
                    <input
                      type="number" min="1" step="1" value={topupAmount}
                      onChange={e => setTopupAmount(e.target.value)}
                      placeholder="Amount (RWF)"
                      className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    <button type="submit" disabled={topupLoading}
                      className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50 hover:bg-blue-700">
                      {topupLoading ? "…" : "Send"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Agent code + QR */}
            <AccessCodeCard user={user} />

          {/* Float request history */}
            {floatRequests.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Top-up history</h3>
                <div className="space-y-2.5">
                  {floatRequests.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {new Intl.NumberFormat("en-RW").format(r.amount)} RWF
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        r.status === "approved" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                        r.status === "rejected" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                        "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
