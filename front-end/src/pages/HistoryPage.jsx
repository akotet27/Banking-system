import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { getTransactions } from "../api/walletApi";
import { formatCurrency } from "../utils/validation";
import {
  SendIcon, ArrowDownIcon, StoreIcon, InboxArrowDownIcon, BankNoteIcon, SearchIcon,
} from "../components/Icons";

const TABS = ["All", "Sent", "Received", "Cash in", "Cash out", "Payments"];

const TYPE_META = {
  send:         { Icon: SendIcon,           color: "bg-orange-100", text: "text-orange-600",  label: "Send Money" },
  receive:      { Icon: InboxArrowDownIcon, color: "bg-emerald-100",text: "text-emerald-600", label: "Received" },
  cash_in:      { Icon: ArrowDownIcon,      color: "bg-blue-100",   text: "text-blue-600",    label: "Cash In" },
  cash_out:     { Icon: BankNoteIcon,       color: "bg-red-100",    text: "text-red-600",     label: "Cash Out" },
  pay_merchant: { Icon: StoreIcon,          color: "bg-purple-100", text: "text-purple-600",  label: "Payment" },
};

function getTxType(t, userId) {
  const raw = t.type === "send_money" ? "send" : t.type;
  if (raw === "send") return t.initiator_id === userId ? "send" : "receive";
  return raw;
}

function getTxLabel(t, userId) {
  const type = getTxType(t, userId);
  const name = t.counterparty_name ?? t.counterparty_phone;
  if (type === "send")         return `Sent to ${name ?? "recipient"}`;
  if (type === "receive")      return `Received from ${name ?? "sender"}`;
  if (type === "cash_in")      return "Cash in via agent";
  if (type === "cash_out")     return "Cash out via agent";
  if (type === "pay_merchant") return `Paid ${name ?? "merchant"}`;
  return t.type;
}

function isDebit(t, userId) {
  const type = getTxType(t, userId);
  return (type === "send" || type === "cash_out" || type === "pay_merchant") && t.initiator_id === userId;
}

function groupByDate(txns) {
  const groups = {};
  txns.forEach((t) => {
    const d = new Date(t.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let key;
    if (d.toDateString() === today.toDateString()) key = "TODAY";
    else if (d.toDateString() === yesterday.toDateString()) key = "YESTERDAY";
    else key = d.toLocaleDateString("en-RW", { month: "long", day: "numeric" }).toUpperCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return groups;
}

export default function HistoryPage() {
  const { user, token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getTransactions(token, 50)
      .then((data) => setTransactions(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = transactions.filter((t) => {
    const type = getTxType(t, user?.id);
    if (tab === "Sent"     && type !== "send")         return false;
    if (tab === "Received" && type !== "receive")       return false;
    if (tab === "Cash in"  && type !== "cash_in")       return false;
    if (tab === "Cash out" && type !== "cash_out")      return false;
    if (tab === "Payments" && type !== "pay_merchant")  return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        getTxLabel(t, user?.id).toLowerCase().includes(q) ||
        formatCurrency(t.amount).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const grouped = groupByDate(filtered);

  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">

        <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mb-5">
          ← Back to dashboard
        </Link>

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">Transaction history</h1>
          <p className="text-slate-400 text-sm mt-0.5 hidden sm:block">Every send, cash in, cash out, and payment — all in one place.</p>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Filter tabs — horizontally scrollable, never wraps */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                tab === t
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-slate-400 text-sm">No transactions match your filter.</p>
          ) : (
            Object.entries(grouped).map(([dateLabel, txns]) => (
              <div key={dateLabel}>
                <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  {dateLabel}
                </p>
                {txns.map((t) => {
                  const type = getTxType(t, user?.id);
                  const meta = TYPE_META[type] ?? TYPE_META.send;
                  const debit = isDebit(t, user?.id);
                  const dt = new Date(t.created_at);
                  const dateStr = dt.toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" });
                  const timeStr = dt.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <div className={`w-9 h-9 md:w-10 md:h-10 ${meta.color} ${meta.text} rounded-xl flex items-center justify-center shrink-0`}>
                        <meta.Icon className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{getTxLabel(t, user?.id)}</p>
                        <p className="text-xs text-slate-400">{dateStr} · {timeStr}</p>
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">#{t.id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${debit ? "text-red-500" : "text-emerald-600"}`}>
                          {debit ? "−" : "+"}{formatCurrency(t.amount)}
                        </p>
                        <p className="text-[11px] text-slate-400">{parseFloat(t.fee) > 0 ? `fee ${formatCurrency(t.fee)}` : "no fee"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
