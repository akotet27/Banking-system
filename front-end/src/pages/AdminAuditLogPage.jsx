import { useEffect, useState } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheckIcon, SearchIcon, DownloadIcon } from "../components/Icons";

import { API_BASE as BASE } from "../api/base.js";
function authed(token) { return { Authorization: `Bearer ${token}` }; }

async function exportAuditPDF(entries) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const ORANGE   = [249, 115, 22];
  const DARK     = [11,  29,  62];
  const WHITE    = [255, 255, 255];
  const LIGHT    = [248, 250, 252];
  const GRAY     = [100, 116, 139];
  const W = 210;
  const now = new Date();

  // ── Header banner ──
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 35, "F");

  doc.setFillColor(...ORANGE);
  doc.roundedRect(12, 8, 18, 18, 3, 3, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("IB", 21, 20, { align: "center" });

  doc.setFontSize(16);
  doc.text("Ishimwe Bank", 35, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 195, 220);
  doc.text("System Audit Log", 35, 22);

  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Generated:", W - 12, 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(
    now.toLocaleDateString("en-RW", { day: "2-digit", month: "long", year: "numeric" }) +
    "  " + now.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" }),
    W - 12, 17, { align: "right" }
  );
  doc.setFont("helvetica", "bold");
  doc.text("Total events:", W - 12, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(String(entries.length), W - 12, 29, { align: "right" });

  // ── Sub-header ──
  doc.setFillColor(...LIGHT);
  doc.rect(0, 35, W, 10, "F");
  doc.setTextColor(...GRAY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Append-only record — no entry can be edited or deleted, including by admin accounts.", 12, 41);

  // ── Table header ──
  let y = 53;
  doc.setFillColor(...DARK);
  doc.rect(10, y - 5, W - 20, 8, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const cols    = [12, 48, 110, 162];
  const headers = ["TIMESTAMP", "EVENT", "ACTOR", "SESSION / REF"];
  headers.forEach((h, i) => doc.text(h, cols[i], y, { baseline: "middle" }));
  y += 8;

  // ── Rows ──
  doc.setFont("helvetica", "normal");
  entries.forEach((e, idx) => {
    if (y > 272) {
      doc.addPage();
      y = 20;
      doc.setFillColor(...DARK);
      doc.rect(10, y - 5, W - 20, 8, "F");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      headers.forEach((h, i) => doc.text(h, cols[i], y, { baseline: "middle" }));
      y += 8;
      doc.setFont("helvetica", "normal");
    }

    const bg = idx % 2 === 0 ? WHITE : LIGHT;
    doc.setFillColor(...bg);
    doc.rect(10, y - 4, W - 20, 7.5, "F");

    const ts = new Date(e.created_at);
    const tsStr = ts.toLocaleString("en-RW", { dateStyle: "short", timeStyle: "medium" });
    const event = (e.event_type ?? "unknown").replace(/_/g, " ");
    const actor = `Session #${e.session_id ?? "—"}`;
    const ref   = `SES-${String(e.session_id ?? 0).padStart(5, "0")}`;

    doc.setTextColor(...GRAY);
    doc.setFontSize(6.5);
    doc.text(tsStr, cols[0], y, { baseline: "middle" });
    doc.setTextColor(11, 29, 62);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(event, cols[1], y, { baseline: "middle" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(actor, cols[2], y, { baseline: "middle" });
    doc.setFontSize(6.5);
    doc.text(ref, cols[3], y, { baseline: "middle" });
    y += 7.5;
  });

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...DARK);
    doc.rect(0, 287, W, 10, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("© 2026 Ishimwe Bank — Confidential audit record", 12, 293);
    doc.text(`Page ${i} of ${pageCount}`, W - 12, 293, { align: "right" });
  }

  doc.save(`ishimwe-audit-log-${now.toISOString().slice(0, 10)}.pdf`);
}

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

const PAGE_SIZE = 10;

export default function AdminAuditLogPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/admin/audit-log?limit=500`, { headers: authed(token) })
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Reset to page 1 whenever filter changes
  useEffect(() => { setPage(1); }, [tab, search]);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstItem  = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const lastItem   = Math.min(safePage * PAGE_SIZE, filtered.length);

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
          <div className="flex gap-2 self-start sm:self-auto shrink-0">
            <button onClick={handleExport} className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <DownloadIcon className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={async () => {
                setExportingPdf(true);
                try { await exportAuditPDF(filtered); } finally { setExportingPdf(false); }
              }}
              disabled={exportingPdf || filtered.length === 0}
              className="flex items-center gap-2 bg-[#0B1D3E] text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-[#162d5e] disabled:opacity-50 transition-colors"
            >
              <DownloadIcon className="w-4 h-4" />
              {exportingPdf ? "Generating…" : "PDF"}
            </button>
          </div>
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
                  paginated.map(e => {
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

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Showing <span className="font-semibold text-slate-600 dark:text-slate-300">{firstItem}–{lastItem}</span> of{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered.length}</span> events
            </p>

            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>

              {/* Page numbers — show window of up to 5 around current page */}
              {(() => {
                const delta = 2;
                const start = Math.max(1, safePage - delta);
                const end   = Math.min(totalPages, safePage + delta);
                const pages = [];
                if (start > 1) {
                  pages.push(1);
                  if (start > 2) pages.push("…");
                }
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push("…");
                  pages.push(totalPages);
                }
                return pages.map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm select-none">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                        p === safePage
                          ? "bg-[#0B1D3E] dark:bg-white text-white dark:text-slate-900"
                          : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              {/* Next */}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
