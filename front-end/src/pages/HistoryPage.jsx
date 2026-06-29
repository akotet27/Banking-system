import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { getTransactions } from "../api/walletApi";
import { formatCurrency } from "../utils/validation";
import {
  SendIcon, ArrowDownIcon, StoreIcon, InboxArrowDownIcon, BankNoteIcon, SearchIcon,
} from "../components/Icons";
import { API_BASE as BASE } from "../api/base.js";

const CUSTOMER_TABS = ["All", "Sent", "Received", "Cash in", "Cash out", "Payments"];
const ADMIN_TABS    = ["All", "Send money", "Cash in", "Cash out", "Payments"];

const ADMIN_PAGE_SIZE    = 10;
const CUSTOMER_PAGE_SIZE = 15;

const TYPE_META = {
  send:         { Icon: SendIcon,           color: "bg-orange-100 dark:bg-orange-900/30",  text: "text-orange-600 dark:text-orange-400",  label: "Send Money" },
  receive:      { Icon: InboxArrowDownIcon, color: "bg-emerald-100 dark:bg-emerald-900/30",text: "text-emerald-600 dark:text-emerald-400", label: "Received" },
  cash_in:      { Icon: ArrowDownIcon,      color: "bg-blue-100 dark:bg-blue-900/30",      text: "text-blue-600 dark:text-blue-400",       label: "Cash In" },
  cash_out:     { Icon: BankNoteIcon,       color: "bg-red-100 dark:bg-red-900/30",        text: "text-red-600 dark:text-red-400",         label: "Cash Out" },
  pay_merchant: { Icon: StoreIcon,          color: "bg-purple-100 dark:bg-purple-900/30",  text: "text-purple-600 dark:text-purple-400",  label: "Payment" },
  send_money:   { Icon: SendIcon,           color: "bg-orange-100 dark:bg-orange-900/30",  text: "text-orange-600 dark:text-orange-400",  label: "Send Money" },
};

const STATUS_BADGE = {
  completed: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  pending:   "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  failed:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
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
    else key = d.toLocaleDateString("en-RW", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return groups;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" });
}
function fmt(n) { return new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(n); }

function Pagination({ page, totalPages, total, pageSize, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  const from = page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, total);
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700">
      <span className="text-xs text-slate-400 dark:text-slate-500">
        {from}–{to} of {total} transactions · page {page + 1} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === "admin";
  const isAgent = user?.role === "agent";

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState("All");
  const [search, setSearch]             = useState("");
  const [userMap, setUserMap]           = useState({});
  const [page, setPage]                 = useState(0);

  const TABS     = isAdmin ? ADMIN_TABS : CUSTOMER_TABS;
  const PAGE_SIZE = isAdmin ? ADMIN_PAGE_SIZE : CUSTOMER_PAGE_SIZE;

  // Reset to first page whenever filter or search changes
  useEffect(() => { setPage(0); }, [tab, search]);

  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        fetch(`${BASE}/admin/transactions?limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).catch(() => []),
        fetch(`${BASE}/admin/users?limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).catch(() => []),
      ]).then(([txns, users]) => {
        setTransactions(txns ?? []);
        const map = {};
        (users ?? []).forEach(u => { map[u.id] = u.phone_number; });
        setUserMap(map);
      }).finally(() => setLoading(false));
    } else {
      getTransactions(token, 100)
        .then(data => setTransactions(data ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [token, isAdmin]);

  const filtered = transactions.filter((t) => {
    if (isAdmin) {
      const rawType = t.transaction_type ?? t.type ?? "";
      if (tab === "Send money" && rawType !== "send_money") return false;
      if (tab === "Cash in"    && rawType !== "cash_in")    return false;
      if (tab === "Cash out"   && rawType !== "cash_out")   return false;
      if (tab === "Payments"   && rawType !== "pay_merchant") return false;
      if (search) {
        const q = search.toLowerCase();
        const phone = userMap[t.initiator_id] ?? "";
        return (
          phone.includes(q) ||
          rawType.toLowerCase().includes(q) ||
          fmt(parseFloat(t.amount)).includes(q)
        );
      }
      return true;
    }

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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const backTo     = isAdmin ? "/admin" : isAgent ? "/agent" : "/dashboard";

  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">

        <Link to={backTo} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mb-5">
          ← Back
        </Link>

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">Transaction history</h1>
          <p className="text-slate-400 text-sm mt-0.5 hidden sm:block">
            {isAdmin
              ? "All transactions across the system."
              : "Every send, cash in, cash out, and payment — all in one place."}
          </p>
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

        {/* Filter tabs */}
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

        {/* ── Admin: table view ── */}
        {isAdmin ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">All transactions</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">{filtered.length} results</span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[0,1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-5 py-12 text-center text-slate-400 text-sm">No transactions match your filter.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                        <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Date</th>
                        <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Time</th>
                        <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Type</th>
                        <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Initiator</th>
                        <th className="text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Amount</th>
                        <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Fee</th>
                        <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {pageItems.map(t => {
                        const rawType   = t.transaction_type ?? t.type ?? "";
                        const meta      = TYPE_META[rawType] ?? TYPE_META.send_money;
                        const statusCls = STATUS_BADGE[t.status] ?? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
                        const phone     = userMap[t.initiator_id] ?? `#${t.initiator_id}`;
                        return (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-5 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 text-xs font-medium">{fmtDate(t.created_at)}</td>
                            <td className="px-5 py-3 whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs">{fmtTime(t.created_at)}</td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${meta.color} ${meta.text}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-slate-700 dark:text-slate-300">{phone}</td>
                            <td className="px-5 py-3 whitespace-nowrap text-right font-bold text-slate-900 dark:text-white">{fmt(parseFloat(t.amount))} <span className="text-slate-400 font-normal">RWF</span></td>
                            <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{parseFloat(t.fee) > 0 ? fmt(parseFloat(t.fee)) + " RWF" : "—"}</td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${statusCls}`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPrev={() => setPage(p => Math.max(0, p - 1))}
                  onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                />
              </>
            )}
          </div>
        ) : (
          /* ── Customer / Agent: card list view ── */
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
              <>
                {Object.entries(groupByDate(pageItems)).map(([dateLabel, txns]) => (
                  <div key={dateLabel}>
                    <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      {dateLabel}
                    </p>
                    {txns.map((t) => {
                      const type  = getTxType(t, user?.id);
                      const meta  = TYPE_META[type] ?? TYPE_META.send;
                      const debit = isDebit(t, user?.id);
                      const dt    = new Date(t.created_at);
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
                ))}
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPrev={() => setPage(p => Math.max(0, p - 1))}
                  onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                />
              </>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
