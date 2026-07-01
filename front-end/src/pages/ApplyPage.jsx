import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE } from "../api/base.js";
import { CheckCircleIcon, ClockIcon, StoreIcon, UserIcon } from "../components/Icons";

function StatusBadge({ status }) {
  const styles = {
    pending:  "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    approved: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${styles[status] ?? styles.pending}`}>
      {status === "approved" && <CheckCircleIcon className="w-3 h-3" />}
      {status === "pending"  && <ClockIcon className="w-3 h-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ApplyPage() {
  const { token } = useAuth();

  const [agentApp,    setAgentApp]    = useState(null);
  const [merchantApp, setMerchantApp] = useState(null);
  const [loading,     setLoading]     = useState(true);

  const [applyingAgent,    setApplyingAgent]    = useState(false);
  const [applyingMerchant, setApplyingMerchant] = useState(false);
  const [businessName,     setBusinessName]     = useState("");
  const [agentError,       setAgentError]       = useState(null);
  const [merchantError,    setMerchantError]    = useState(null);
  const [agentMsg,         setAgentMsg]         = useState(null);
  const [merchantMsg,      setMerchantMsg]      = useState(null);

  async function load() {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const [aRes, mRes] = await Promise.all([
      fetch(`${API_BASE}/agents/my-application`, { headers }),
      fetch(`${API_BASE}/merchants/my-application`, { headers }),
    ]);
    setAgentApp(aRes.ok ? await aRes.json() : null);
    setMerchantApp(mRes.ok ? await mRes.json() : null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  async function applyAgent() {
    setAgentError(null);
    setApplyingAgent(true);
    try {
      const res = await fetch(`${API_BASE}/agents/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to submit application");
      }
      setAgentMsg("Agent application submitted! The admin will review it shortly.");
      load();
    } catch (err) {
      setAgentError(err.message);
    } finally {
      setApplyingAgent(false);
    }
  }

  async function applyMerchant(e) {
    e.preventDefault();
    if (!businessName.trim()) { setMerchantError("Enter your business name."); return; }
    setMerchantError(null);
    setApplyingMerchant(true);
    try {
      const res = await fetch(`${API_BASE}/merchants/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: businessName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to submit application");
      }
      setMerchantMsg("Merchant application submitted! The admin will review it shortly.");
      setBusinessName("");
      load();
    } catch (err) {
      setMerchantError(err.message);
    } finally {
      setApplyingMerchant(false);
    }
  }

  const agentBlocked    = agentApp   && agentApp.status   !== "rejected";
  const merchantBlocked = merchantApp && merchantApp.status !== "rejected";

  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">
        <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mb-5">
          ← Back to dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">Upgrade your account</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
            Apply to become an agent or merchant. Applications are reviewed by the admin team.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">

            {/* ── Agent card ── */}
            <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden ${merchantBlocked ? "opacity-40 pointer-events-none" : ""}`}>
              {merchantBlocked && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 px-5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  You have a merchant application — you can only hold one role.
                </div>
              )}
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">Become an Agent</h2>
                    <p className="text-blue-100 text-xs">Process cash in &amp; cash out</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-5">
                  {["Process cash in and cash out for customers", "Earn commission on every transaction", "Manage float balance", "Review customer KYC documents", "Get your unique 6-digit agent code + QR"].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                {agentApp ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Application status</span>
                      <StatusBadge status={agentApp.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      Submitted {new Date(agentApp.created_at).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                    {agentApp.status === "rejected" && (
                      <button
                        onClick={applyAgent}
                        disabled={applyingAgent}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
                      >
                        {applyingAgent ? "Submitting…" : "Re-apply"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agentError && (
                      <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-3 py-2">{agentError}</p>
                    )}
                    {agentMsg && (
                      <p className="text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2">{agentMsg}</p>
                    )}
                    {!agentMsg && (
                      <button
                        onClick={applyAgent}
                        disabled={applyingAgent}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors"
                      >
                        {applyingAgent ? "Submitting…" : "Apply to become an agent →"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Merchant card ── */}
            <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden ${agentBlocked ? "opacity-40 pointer-events-none" : ""}`}>
              {agentBlocked && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 px-5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  You have an agent application — you can only hold one role.
                </div>
              )}
              <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <StoreIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">Become a Merchant</h2>
                    <p className="text-orange-100 text-xs">Accept payments from customers</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-5">
                  {["Accept payments directly to your wallet", "Zero fee for customers paying you", "Share your QR code at your till", "Get your unique 6-digit merchant code", "Track all incoming payments in history"].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                {merchantApp ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Application status</span>
                      <StatusBadge status={merchantApp.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      {merchantApp.business_name} · Submitted {new Date(merchantApp.created_at).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                    {merchantApp.status === "rejected" && (
                      <form onSubmit={applyMerchant} className="space-y-2">
                        <input
                          type="text" value={businessName}
                          onChange={e => setBusinessName(e.target.value)}
                          placeholder="Business name"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <button type="submit" disabled={applyingMerchant}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                          {applyingMerchant ? "Submitting…" : "Re-apply"}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {merchantError && (
                      <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-3 py-2">{merchantError}</p>
                    )}
                    {merchantMsg && (
                      <p className="text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2">{merchantMsg}</p>
                    )}
                    {!merchantMsg && (
                      <form onSubmit={applyMerchant} className="space-y-2">
                        <input
                          type="text" value={businessName}
                          onChange={e => setBusinessName(e.target.value)}
                          placeholder="Your business name"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <button type="submit" disabled={applyingMerchant}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors">
                          {applyingMerchant ? "Submitting…" : "Apply as merchant →"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
