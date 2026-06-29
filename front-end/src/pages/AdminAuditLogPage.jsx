import { useEffect, useState } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheckIcon, SearchIcon, DownloadIcon } from "../components/Icons";

const BASE = "http://localhost:8000";
function authed(token) { return { Authorization: `Bearer ${token}` }; }

const EVENT_COLORS = {
  session_approved:   { dot: "bg-emerald-500", label: "Approved" },
  session_declined:   { dot: "bg-red-500",     label: "Declined" },
  session_expired:    { dot: "bg-orange-500",  label: "Expired" },
  session_requested:  { dot: "bg-blue-500",    label: "Requested" },
  cash_in_completed:  { dot: "bg-emerald-500", label: "Cash in" },
  cash_out_completed: { dot: "bg-emerald-500", label: "Cash out" },
};

function getEventConfig(type) {
  for (const [key, cfg] of Object.entries(EVENT_COLORS)) {
    if (type?.includes(key)) return cfg;
  }
  return { dot: "bg-slate-400", label: "Event" };
}

const TABS = [
  { key: "all",         label: "All events" },
  { key: "sessions",    label: "Sessions" },
  { key: "approvals",   label: "Approvals" },
  { key: "fee_changes", label: "Fee changes" },
  { key: "logins",      label: "Logins" },
];

export default function AdminAuditLogPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${BASE}/admin/audit-log?limit=100`, { headers: authed(token) })
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  function filterByTab(entries) {
    if (tab === "sessions") return entries.filter(e => e.event_type?.includes("session"));
    if (tab === "approvals") return entries.filter(e => e.event_type?.includes("approv") || e.event_type?.includes("review"));
    if (tab === "fee_changes") return entries.filter(e => e.event_type?.includes("fee"));
    if (tab === "logins") return entries.filter(e => e.event_type?.includes("login") || e.event_type?.includes("auth"));
    return entries;
  }

  const filtered = filterByTab(logs).filter(e =>
    !search || e.event_type?.toLowerCase().includes(search.toLowerCase()) || String(e.session_id).includes(search)
  );

  function handleExport() {
    const rows = [["Timestamp", "Event", "Session ID", "Notes"]];
    filtered.forEach(e => {
      const ts = new Date(e.created_at).toISOString();
      rows.push([ts, e.event_type ?? "", String(e.session_id ?? ""), e.notes ?? ""]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SidebarLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Audit log</h1>
            <p className="text-slate-400 text-sm mt-0.5">Every session event, system change, and admin action — in order.</p>
          </div>
          <button onClick={handleExport} className="self-start sm:self-auto shrink-0 flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Append-only notice */}
        <div className="flex items-start gap-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-5">
          <ShieldCheckIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This log is append-only. No entry can be edited or deleted, including by admin accounts.
          </p>
        </div>

        {/* Filter tabs + Search */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? "bg-[#0B1D3E] dark:bg-white text-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by user or session ID"
              className="pl-9 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-full"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  {["Timestamp", "Event", "Actor", "Session / Ref"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {loading ? (
                  [0,1,2,3,4].map(i => (
                    <tr key={i}>
                      {[0,1,2,3].map(j => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-slate-400 text-sm">
                      No audit events match your filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map(e => {
                    const cfg = getEventConfig(e.event_type);
                    const ts = new Date(e.created_at);
                    return (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-4 text-slate-400 dark:text-slate-500 text-xs font-mono whitespace-nowrap">
                          {ts.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          <span className="text-slate-300 dark:text-slate-600">.{String(ts.getMilliseconds()).padStart(3, "0")}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot} mt-1.5 shrink-0`} />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{e.event_type?.replace(/_/g, " ") ?? "Unknown event"}</p>
                              {e.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{e.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap text-sm">
                          Session #{e.session_id}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
                            SES-{String(e.session_id).padStart(5, "0")}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
