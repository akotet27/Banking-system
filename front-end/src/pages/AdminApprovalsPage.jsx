import { useEffect, useState } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { CheckCircleIcon, XIcon, ShieldCheckIcon, UserIcon } from "../components/Icons";

const BASE = "http://localhost:8000";
function authed(token) { return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; }
async function api(path, token, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: authed(token), ...opts });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function AppCard({ app, type, onAction, acting }) {
  const initials = (app.business_name ?? `U${app.user_id}`).slice(0, 2).toUpperCase();
  const isAgent = type === "agent";
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${isAgent ? "bg-blue-500" : "bg-orange-500"}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${isAgent ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"}`}>
                {isAgent ? "Agent application" : "Merchant application"}
              </span>
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {app.business_name ?? `User #${app.user_id}`}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Submitted {timeAgo(app.created_at)}</span>
            {app.proposed_location && <span>· {app.proposed_location}</span>}
            {app.proposed_float && <span>· Float: {new Intl.NumberFormat("en-RW").format(app.proposed_float)} RWF</span>}
          </div>
          {/* Doc checkboxes */}
          <div className="flex gap-4 mt-3">
            {isAgent ? (
              <>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" className="accent-blue-600 w-3.5 h-3.5" readOnly />
                  ID
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" className="accent-blue-600 w-3.5 h-3.5" readOnly />
                  Business license
                </label>
              </>
            ) : (
              <>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" className="accent-orange-500 w-3.5 h-3.5" readOnly />
                  Business license
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" className="accent-orange-500 w-3.5 h-3.5" readOnly />
                  Tax ID
                </label>
              </>
            )}
          </div>
        </div>
        {/* Actions */}
        {app.status === "pending" ? (
          <div className="flex gap-2 shrink-0 self-end sm:self-start">
            <button
              onClick={() => onAction(app.id, "rejected")}
              disabled={acting === app.id}
              className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
            >
              {acting === app.id ? "…" : "Reject"}
            </button>
            <button
              onClick={() => onAction(app.id, "approved")}
              disabled={acting === app.id}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {acting === app.id ? "…" : "Approve"}
            </button>
          </div>
        ) : (
          <span className={`self-start text-xs font-bold px-2.5 py-1 rounded-full ${app.status === "approved" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
            {app.status}
          </span>
        )}
      </div>
    </div>
  );
}

function KycCard({ kyc, onAction, acting }) {
  const [doc, num] = (kyc.id_document_ref ?? "").split(": ");
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0">
          <UserIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            KYC — Identity verification
          </span>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
            {kyc.customer_name ?? `Customer #${kyc.customer_id}`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{kyc.customer_phone}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2.5">
              <p className="text-slate-400 mb-0.5">Document type</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{doc || "—"}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2.5">
              <p className="text-slate-400 mb-0.5">Document number</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{num || kyc.id_document_ref || "—"}</p>
            </div>
            {kyc.customer_dob && (
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2.5">
                <p className="text-slate-400 mb-0.5">Date of birth</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{kyc.customer_dob}</p>
              </div>
            )}
            {kyc.customer_location && (
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2.5">
                <p className="text-slate-400 mb-0.5">Location</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{kyc.customer_location}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">Submitted {timeAgo(kyc.created_at)}</p>
        </div>
        <div className="flex gap-2 shrink-0 self-end sm:self-start">
          <button
            onClick={() => onAction(kyc.id, "rejected")}
            disabled={acting === kyc.id}
            className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
          >
            {acting === kyc.id ? "…" : "Reject"}
          </button>
          <button
            onClick={() => onAction(kyc.id, "verified")}
            disabled={acting === kyc.id}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheckIcon className="w-4 h-4" />
            {acting === kyc.id ? "…" : "Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminApprovalsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState("kyc");
  const [agents, setAgents] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [kycList, setKycList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api("/admin/applications/agents", token).catch(() => []),
      api("/admin/applications/merchants", token).catch(() => []),
      api("/kyc/pending", token).catch(() => []),
    ]).then(([a, m, k]) => {
      setAgents(a ?? []);
      setMerchants(m ?? []);
      setKycList(k ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  async function handleAppAction(id, status, type) {
    setActing(id);
    setError(null);
    try {
      await api(`/admin/applications/${type}s/review`, token, {
        method: "POST",
        body: JSON.stringify({ application_id: id, status }),
      });
      load();
    } catch (e) {
      setError(e?.detail ?? "Action failed");
    } finally {
      setActing(null);
    }
  }

  async function handleKycAction(id, status) {
    setActing(id);
    setError(null);
    try {
      await api("/kyc/review", token, {
        method: "POST",
        body: JSON.stringify({ kyc_request_id: id, status }),
      });
      load();
    } catch (e) {
      setError(e?.detail ?? "Action failed");
    } finally {
      setActing(null);
    }
  }

  const pendingAgents    = agents.filter(a => a.status === "pending");
  const pendingMerchants = merchants.filter(a => a.status === "pending");
  const pendingTotal     = pendingAgents.length + pendingMerchants.length + kycList.length;

  const displayedApps =
    tab === "agents"    ? agents :
    tab === "merchants" ? merchants :
    [...agents.map(a => ({ ...a, _type: "agent" })), ...merchants.map(a => ({ ...a, _type: "merchant" }))]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const tabs = [
    { key: "kyc",       label: "KYC",       count: kycList.length },
    { key: "agents",    label: "Agents",    count: pendingAgents.length },
    { key: "merchants", label: "Merchants", count: pendingMerchants.length },
  ];

  return (
    <SidebarLayout pendingCount={pendingTotal}>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Pending approvals</h1>
          <p className="text-slate-400 text-sm mt-0.5">Review KYC requests, agent and merchant applications.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-[#0B1D3E] dark:bg-white text-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${tab === t.key ? "bg-orange-500 text-white" : "bg-orange-100 dark:bg-orange-900/40 text-orange-600"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
        ) : tab === "kyc" ? (
          kycList.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <ShieldCheckIcon className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-400 dark:text-slate-500 text-sm">No pending KYC requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {kycList.map(kyc => (
                <KycCard key={kyc.id} kyc={kyc} acting={acting} onAction={handleKycAction} />
              ))}
            </div>
          )
        ) : displayedApps.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
            <CheckCircleIcon className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">No applications in this category.</p>
          </div>
        ) : (
          <div className="space-y-3">
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
        )}
      </div>
    </SidebarLayout>
  );
}
