import { useEffect, useState } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { CheckCircleIcon, ShieldCheckIcon, UserIcon, XIcon } from "../components/Icons";

import { API_BASE as BASE } from "../api/base.js";
function authed(token) { return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; }
async function api(path, token, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: authed(token), ...opts });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr);
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function ActionButtons({ id, acting, onApprove, onReject, approveLabel = "Approve", rejectLabel = "Reject" }) {
  const busy = acting === id;
  return (
    <div className="flex gap-2 shrink-0">
      <button onClick={onReject} disabled={busy}
        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400 disabled:opacity-40 transition-all">
        {busy ? "…" : rejectLabel}
      </button>
      <button onClick={onApprove} disabled={busy}
        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5 transition-colors shadow-sm">
        <CheckCircleIcon className="w-4 h-4" />
        {busy ? "…" : approveLabel}
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-16 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-emerald-500" />
      </div>
      <p className="text-slate-800 dark:text-slate-200 font-semibold mb-1">All clear</p>
      <p className="text-slate-400 dark:text-slate-500 text-sm">{message}</p>
    </div>
  );
}

function Badge({ label, color }) {
  const styles = {
    blue:   "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    orange: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    green:  "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    violet: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
  };
  return (
    <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-lg ${styles[color]}`}>
      {label}
    </span>
  );
}

/* ── KYC Card ── */
function KycCard({ kyc, onAction, acting }) {
  const [doc, num] = (kyc.id_document_ref ?? "").split(": ");
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-50 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
              {kyc.customer_name ?? `Customer #${kyc.customer_id}`}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{kyc.customer_phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge label="KYC" color="green" />
          <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(kyc.created_at)}</span>
        </div>
      </div>
      {/* Details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 dark:bg-slate-700/50">
        {[
          { label: "Document type",   value: doc || "—" },
          { label: "Document number", value: num || kyc.id_document_ref || "—", mono: true },
          { label: "Date of birth",   value: kyc.customer_dob || "—" },
          { label: "Location",        value: kyc.customer_location || "—" },
        ].map(({ label, value, mono }) => (
          <div key={label} className="bg-white dark:bg-slate-800 px-5 py-3.5">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-sm font-semibold text-slate-900 dark:text-white truncate ${mono ? "font-mono" : ""}`}>{value}</p>
          </div>
        ))}
      </div>
      {/* Actions */}
      <div className="px-5 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/20">
        <p className="text-xs text-slate-400 dark:text-slate-500">Verify identity to unlock higher transaction limits.</p>
        <ActionButtons
          id={kyc.id} acting={acting}
          onApprove={() => onAction(kyc.id, "verified")}
          onReject={() => onAction(kyc.id, "rejected")}
          approveLabel="Verify"
        />
      </div>
    </div>
  );
}

/* ── Application Card (Agent / Merchant) ── */
function AppCard({ app, type, onAction, acting }) {
  const isAgent  = type === "agent";
  const nameStr  = app.full_name ?? `User #${app.user_id}`;
  const initials = nameStr.trim().split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const kycColor = app.kyc_status === "verified"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-50 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${isAgent ? "bg-blue-500" : "bg-orange-500"}`}>
            {initials}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{nameStr}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {app.phone_number ?? "—"}{app.location ? ` · ${app.location}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge label={isAgent ? "Agent" : "Merchant"} color={isAgent ? "blue" : "orange"} />
          <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(app.created_at)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 dark:bg-slate-700/50">
        <div className="bg-white dark:bg-slate-800 px-5 py-3.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{app.email ?? "—"}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 px-5 py-3.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">District</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{app.location ?? "—"}</p>
        </div>
        {isAgent ? (
          <div className="bg-white dark:bg-slate-800 px-5 py-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">KYC</p>
            <p className={`text-sm font-bold capitalize ${kycColor}`}>{app.kyc_status ?? "none"}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 px-5 py-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Business</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{app.business_name ?? "—"}</p>
          </div>
        )}
        <div className="bg-white dark:bg-slate-800 px-5 py-3.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            {app.status}
          </span>
        </div>
      </div>

      {app.status === "pending" ? (
        <div className="px-5 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/20">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {isAgent ? "Approving grants agent role and float wallet." : "Approving grants merchant role and payment QR."}
          </p>
          <ActionButtons
            id={app.id} acting={acting}
            onApprove={() => onAction(app.id, "approved")}
            onReject={() => onAction(app.id, "rejected")}
          />
        </div>
      ) : (
        <div className="px-5 py-4 flex items-center justify-end bg-slate-50/60 dark:bg-slate-900/20">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${app.status === "approved" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
            {app.status === "approved" ? "Approved" : "Rejected"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Float Card ── */
function FloatCard({ req, onAction, acting }) {
  const initials = (req.agent_name ?? req.agent_phone ?? "AG").slice(0, 2).toUpperCase();
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-50 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
              {req.agent_name ?? req.agent_phone ?? `Agent #${req.agent_id}`}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{req.agent_phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge label="Float request" color="violet" />
          <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(req.created_at)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-700/50">
        <div className="bg-white dark:bg-slate-800 px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount requested</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {new Intl.NumberFormat("en-RW").format(req.amount)}
            <span className="text-sm font-semibold text-slate-400 ml-1">RWF</span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Effect</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Float balance increases by {new Intl.NumberFormat("en-RW").format(req.amount)} RWF
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Agent can then process more cash-outs</p>
        </div>
      </div>

      <div className="px-5 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/20">
        <p className="text-xs text-slate-400 dark:text-slate-500">Approving credits the agent&apos;s float wallet immediately.</p>
        <ActionButtons
          id={req.id} acting={acting}
          onApprove={() => onAction(req.id, "approve")}
          onReject={() => onAction(req.id, "reject")}
        />
      </div>
    </div>
  );
}

/* ── Page ── */
export default function AdminApprovalsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState("kyc");
  const [agents, setAgents] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [kycList, setKycList] = useState([]);
  const [floatRequests, setFloatRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api("/admin/applications/agents", token).catch(() => []),
      api("/admin/applications/merchants", token).catch(() => []),
      api("/kyc/pending", token).catch(() => []),
      api("/admin/float-requests?status=pending", token).catch(() => []),
    ]).then(([a, m, k, f]) => {
      setAgents(a ?? []);
      setMerchants(m ?? []);
      setKycList(k ?? []);
      setFloatRequests(f ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  async function handleAppAction(id, status, type) {
    setActing(id); setError(null);
    try {
      await api(`/admin/applications/${type}s/review`, token, {
        method: "POST",
        body: JSON.stringify({ application_id: id, status }),
      });
      load();
    } catch (e) { setError(e?.detail ?? "Action failed"); }
    finally { setActing(null); }
  }

  async function handleKycAction(id, status) {
    setActing(id); setError(null);
    try {
      await api("/kyc/review", token, {
        method: "POST",
        body: JSON.stringify({ kyc_request_id: id, status }),
      });
      load();
    } catch (e) { setError(e?.detail ?? "Action failed"); }
    finally { setActing(null); }
  }

  async function handleFloatAction(id, action) {
    setActing(id); setError(null);
    try {
      await api(`/admin/float-requests/${id}/${action}`, token, { method: "POST" });
      load();
    } catch (e) { setError(e?.detail ?? "Action failed"); }
    finally { setActing(null); }
  }

  const pendingAgents    = agents.filter(a => a.status === "pending");
  const pendingMerchants = merchants.filter(a => a.status === "pending");
  const pendingTotal     = pendingAgents.length + pendingMerchants.length + kycList.length + floatRequests.length;

  const displayedApps =
    tab === "agents"    ? agents :
    tab === "merchants" ? merchants :
    [...agents.map(a => ({ ...a, _type: "agent" })), ...merchants.map(a => ({ ...a, _type: "merchant" }))]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const TABS = [
    { key: "kyc",       label: "KYC",         count: kycList.length,          color: "emerald" },
    { key: "agents",    label: "Agents",       count: pendingAgents.length,    color: "blue"    },
    { key: "merchants", label: "Merchants",    count: pendingMerchants.length, color: "orange"  },
    { key: "float",     label: "Float top-up", count: floatRequests.length,    color: "violet"  },
  ];

  const SUMMARY = [
    { label: "KYC pending",       count: kycList.length,          bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
    { label: "Agent applications",count: pendingAgents.length,    bg: "bg-blue-50 dark:bg-blue-900/20",       text: "text-blue-600 dark:text-blue-400",       dot: "bg-blue-500" },
    { label: "Merchant apps",     count: pendingMerchants.length, bg: "bg-orange-50 dark:bg-orange-900/20",   text: "text-orange-600 dark:text-orange-400",   dot: "bg-orange-500" },
    { label: "Float requests",    count: floatRequests.length,    bg: "bg-violet-50 dark:bg-violet-900/20",   text: "text-violet-600 dark:text-violet-400",   dot: "bg-violet-500" },
  ];

  return (
    <SidebarLayout pendingCount={pendingTotal}>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Pending approvals</h1>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
              {pendingTotal === 0 ? "Everything is reviewed — no pending items." : `${pendingTotal} item${pendingTotal !== 1 ? "s" : ""} waiting for review`}
            </p>
          </div>
          <button onClick={load}
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
            ↻ Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SUMMARY.map(s => (
            <button key={s.label} onClick={() => setTab(TABS.find(t => t.label.toLowerCase().includes(s.label.split(" ")[0].toLowerCase()))?.key ?? "kyc")}
              className={`${s.bg} rounded-2xl p-4 text-left transition-transform hover:scale-[1.02] border border-transparent`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${s.dot} ${s.count > 0 ? "animate-pulse" : "opacity-30"}`} />
                <span className={`text-xs font-bold ${s.count > 0 ? s.text : "text-slate-400"}`}>{s.label}</span>
              </div>
              <p className={`text-3xl font-black ${s.count > 0 ? s.text : "text-slate-300 dark:text-slate-600"}`}>{s.count}</p>
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-2xl px-4 py-3">
            <span className="shrink-0">⚠</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-600">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs + content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-100 dark:border-slate-700 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  tab === t.key
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}>
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    tab === t.key
                      ? "bg-orange-500 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}>
                    {t.count}
                  </span>
                )}
                {tab === t.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0B1D3E] dark:bg-white rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5">
            {loading ? (
              <div className="space-y-4">
                {[0,1,2].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse" />)}
              </div>
            ) : tab === "kyc" ? (
              kycList.length === 0
                ? <EmptyState icon={ShieldCheckIcon} message="No KYC requests waiting for review." />
                : <div className="space-y-4">{kycList.map(k => <KycCard key={k.id} kyc={k} acting={acting} onAction={handleKycAction} />)}</div>
            ) : tab === "float" ? (
              floatRequests.length === 0
                ? <EmptyState icon={CheckCircleIcon} message="No float top-up requests pending." />
                : <div className="space-y-4">{floatRequests.map(r => <FloatCard key={r.id} req={r} acting={acting} onAction={handleFloatAction} />)}</div>
            ) : displayedApps.length === 0
                ? <EmptyState icon={CheckCircleIcon} message="No applications in this category." />
                : (
                  <div className="space-y-4">
                    {displayedApps.map(app => (
                      <AppCard
                        key={app.id}
                        app={app}
                        type={app._type ?? (tab === "agents" ? "agent" : "merchant")}
                        acting={acting}
                        onAction={(id, status) => handleAppAction(id, status, app._type ?? (tab === "agents" ? "agent" : "merchant"))}
                      />
                    ))}
                  </div>
                )
            }
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}
