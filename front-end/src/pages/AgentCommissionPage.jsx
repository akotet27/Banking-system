import { useEffect, useState } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { getTransactions } from "../api/walletApi";
import { formatCurrency } from "../utils/validation";
import { InboxArrowDownIcon, BankNoteIcon, CheckCircleIcon, CreditCardIcon } from "../components/Icons";

const PAGE_SIZE = 10;

export default function AgentCommissionPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    getTransactions(token, 200)
      .then((data) => setTransactions(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const cashIns  = transactions.filter((t) => t.type === "cash_in");
  const cashOuts = transactions.filter((t) => t.type === "cash_out");

  const cashOutCommission = cashOuts.reduce((sum, t) => sum + (parseFloat(t.fee) || 0) * 0.5, 0);
  const cashInCommission  = cashIns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0) * 0.001, 0);
  const total = cashOutCommission + cashInCommission;

  const statCards = [
    {
      label: "From cash out fees",
      value: formatCurrency(cashOutCommission),
      sub: `${Math.round((cashOutCommission / (total || 1)) * 100)}% of total commission`,
    },
    {
      label: "From cash in volume bonus",
      value: formatCurrency(cashInCommission),
      sub: `${Math.round((cashInCommission / (total || 1)) * 100)}% of total commission`,
    },
    {
      label: "KYC review bonus",
      value: formatCurrency(0),
      sub: "No KYC reviews this period",
    },
  ];

  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Commission</h1>
          <p className="text-slate-400 text-sm mt-0.5">Your earnings from every transaction you&apos;ve processed.</p>
        </div>

        {/* Summary banner */}
        <div className="rounded-2xl p-6 mb-5" style={{ background: "linear-gradient(135deg, #0B1D3E 0%, #1B3A8A 100%)" }}>
          {loading ? (
            <div className="h-16 flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white/60 text-sm">Loading&hellip;</span>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-8">
              <div>
                <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-2">Total commission this month</p>
                <p className="text-4xl font-extrabold text-white">{new Intl.NumberFormat("en-RW", { minimumFractionDigits: 2 }).format(total)}</p>
                <span className="text-slate-300 font-bold text-lg">RWF</span>
              </div>
              <div className="flex gap-8 text-center shrink-0">
                <div>
                  <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-1">Transactions</p>
                  <p className="text-3xl font-extrabold text-white">{transactions.length}</p>
                </div>
                <div>
                  <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-1">Avg per txn</p>
                  <p className="text-3xl font-extrabold text-white">
                    {transactions.length ? new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(total / transactions.length) : "0"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Breakdown cards */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {statCards.map(({ label, value, sub }) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
              <p className="text-xs text-slate-400 font-semibold mb-2">{label}</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Detail table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 dark:text-white">Recent commission entries</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[0,1,2,3].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="px-6 py-10 text-center text-slate-400 text-sm">No transactions to report yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-5 px-6 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="col-span-1">Customer</div>
                <div>Transaction</div>
                <div>Amount</div>
                <div>Your commission</div>
                <div>When</div>
              </div>
              {transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((t) => {
                const isCashIn  = t.type === "cash_in";
                const isCashOut = t.type === "cash_out";
                const commission = isCashOut
                  ? (parseFloat(t.fee) || 0) * 0.5
                  : isCashIn
                    ? (parseFloat(t.amount) || 0) * 0.001
                    : 0;
                const dt   = new Date(t.created_at);
                const date = dt.toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" });
                const time = dt.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={t.id} className="grid grid-cols-5 px-6 py-4 border-b border-slate-50 hover:bg-slate-50 text-sm items-center">
                    <div className="col-span-1 flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isCashIn ? "bg-emerald-500" : "bg-orange-500"}`}>
                        {String(t.id).slice(-2)}
                      </div>
                      <span className="text-slate-600 font-medium truncate">{t.counterparty_phone?.slice(-9) ?? "-"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      {isCashIn ? <InboxArrowDownIcon className="w-4 h-4 text-emerald-500" /> : <BankNoteIcon className="w-4 h-4 text-orange-500" />}
                      {isCashIn ? "Cash in" : isCashOut ? "Cash out" : t.type}
                    </div>
                    <div className="text-slate-900 font-semibold">{formatCurrency(t.amount)}</div>
                    <div className="text-emerald-600 font-bold">+{formatCurrency(commission)}</div>
                    <div className="text-slate-400">
                      <p>{date}</p>
                      <p className="text-[11px]">{time}</p>
                    </div>
                  </div>
                );
              })}
              {/* Pagination controls */}
              {transactions.length > PAGE_SIZE && (() => {
                const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
                const from = page * PAGE_SIZE + 1;
                const to   = Math.min((page + 1) * PAGE_SIZE, transactions.length);
                return (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {from}–{to} of {transactions.length} entries · page {page + 1} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {transactions.length === 0 && !loading && (
          <div className="mt-6 flex flex-col items-center py-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <CreditCardIcon className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm">Process your first cash in or cash out to start earning commission.</p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

