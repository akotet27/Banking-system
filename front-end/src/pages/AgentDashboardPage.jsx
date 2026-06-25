import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { getBalance, getTransactions, floatTopup } from "../api/walletApi";
import { formatCurrency } from "../utils/validation";
import { InboxArrowDownIcon, BankNoteIcon, ArrowUpIcon, ArrowDownIcon, XIcon } from "../components/Icons";

function StatCard({ label, value, sub, subColor = "text-emerald-500" }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>}
    </div>
  );
}

export default function AgentDashboardPage() {
  const { user, token } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupMsg, setTopupMsg] = useState(null);

  function loadData() {
    setLoading(true);
    Promise.all([getBalance(token), getTransactions(token, 10)])
      .then(([b, txns]) => { setWallet(b); setTransactions(txns ?? []); })
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
      setTopupMsg({ ok: true, text: `Float topped up! New balance: ${formatCurrency(res.float_balance)}` });
      setTopupAmount("");
      loadData();
    } catch (err) {
      setTopupMsg({ ok: false, text: err?.detail ?? "Top-up failed." });
    } finally {
      setTopupLoading(false);
    }
  }

  const firstName = user?.full_name?.split(" ")[0] ?? "Agent";
  const floatBal = wallet?.float_balance ?? 0;
  const totalBal = wallet?.balance ?? 0;

  const cashInToday  = transactions.filter(t => t.transaction_type === "cash_in").length;
  const cashOutToday = transactions.filter(t => t.transaction_type === "cash_out").length;

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  return (
    <SidebarLayout>
      <div className="px-4 md:px-8 py-5 md:py-7 space-y-6 max-w-5xl bg-slate-50 dark:bg-slate-900 min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{greeting()}, {firstName}</h1>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">{cashInToday + cashOutToday} transactions processed today</p>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
            Terminal active
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Float balance"  value={loading ? "..." : new Intl.NumberFormat("en-RW").format(floatBal)} sub="Available RWF" />
          <StatCard label="Cash in today"  value={cashInToday}  sub={`+${cashInToday} deposits`} />
          <StatCard label="Cash out today" value={cashOutToday} sub={`${cashOutToday} withdrawals`} subColor="text-orange-500" />
          <StatCard label="Wallet balance" value={loading ? "..." : new Intl.NumberFormat("en-RW").format(totalBal)} sub="Your account balance" subColor="text-slate-400 dark:text-slate-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: action cards */}
          <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Link to="/cash-in"
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-3">
                  <ArrowUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">New cash in</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Start a deposit</p>
              </Link>
              <Link to="/cashout"
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-3">
                  <ArrowDownIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">New cash out</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Start a withdrawal</p>
              </Link>
            </div>

            {/* Recent transactions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-white">Recent activity</h2>
                <span className="text-xs text-slate-400 dark:text-slate-500">{transactions.length} items</span>
              </div>
              {loading ? (
                <div className="px-5 pb-5 space-y-3">
                  {[0,1,2].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}
                </div>
              ) : transactions.length === 0 ? (
                <p className="px-5 pb-5 text-slate-400 dark:text-slate-500 text-sm">No transactions yet.</p>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50 pb-2">
                  {transactions.slice(0, 5).map(t => {
                    const isIn = t.transaction_type === "cash_in";
                    const isOut = t.transaction_type === "cash_out";
                    return (
                      <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIn ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"}`}>
                          {isIn ? <InboxArrowDownIcon className="w-4 h-4" /> : <BankNoteIcon className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{isIn ? "Cash In" : isOut ? "Cash Out" : "Transaction"}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{t.customer_phone ?? ""}</p>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${isIn ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {isIn ? "+" : "-"}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Float */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Your float</h3>
              {!loading && (
                <>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 mb-1.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min((floatBal / 500000) * 100, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-4">
                    <span>{new Intl.NumberFormat("en-RW").format(floatBal)} used</span>
                    <span>500,000 limit</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Your float drops with every cash out and rises with every cash in.
                  </p>
                </>
              )}
              <button
                onClick={() => { setShowTopup(v => !v); setTopupMsg(null); }}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                <ArrowUpIcon className="w-4 h-4" /> Top up float
              </button>

              {showTopup && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Simulate cash deposit at branch</p>
                    <button onClick={() => setShowTopup(false)} className="text-slate-400 hover:text-slate-600">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                  {topupMsg && (
                    <div className={`text-xs rounded-lg px-3 py-2 mb-2 ${topupMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {topupMsg.text}
                    </div>
                  )}
                  <form onSubmit={handleTopup} className="flex gap-2">
                    <input
                      type="number" min="1" step="1" value={topupAmount}
                      onChange={e => setTopupAmount(e.target.value)}
                      placeholder="Amount (RWF)"
                      className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    <button type="submit" disabled={topupLoading}
                      className="bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">
                      {topupLoading ? "..." : "Add"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
