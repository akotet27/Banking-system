import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { UsersIcon, TrendingUpIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon } from "../components/Icons";

const BASE = "http://localhost:8000";
function authed(token) { return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; }
async function api(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: authed(token) });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

function fmt(n) { return new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(n); }
function fmtVol(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return fmt(n);
}
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-RW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TYPE_META = {
  send:         { bg: "bg-orange-100 dark:bg-orange-900/30",  text: "text-orange-700 dark:text-orange-400",  bar: "bg-orange-500",  label: "Send money" },
  cash_out:     { bg: "bg-blue-100 dark:bg-blue-900/30",      text: "text-blue-700 dark:text-blue-400",      bar: "bg-blue-500",    label: "Cash out" },
  cash_in:      { bg: "bg-emerald-100 dark:bg-emerald-900/30",text: "text-emerald-700 dark:text-emerald-400",bar: "bg-emerald-500", label: "Cash in" },
  pay_merchant: { bg: "bg-purple-100 dark:bg-purple-900/30",  text: "text-purple-700 dark:text-purple-400",  bar: "bg-purple-500",  label: "Pay merchant" },
};
const STATUS_META = {
  completed: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  pending:   { bg: "bg-amber-100 dark:bg-amber-900/30",     text: "text-amber-700 dark:text-amber-400" },
  failed:    { bg: "bg-red-100 dark:bg-red-900/30",         text: "text-red-700 dark:text-red-400" },
};

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [agentApps, setAgentApps] = useState([]);
  const [merchantApps, setMerchantApps] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api("/admin/stats", token).catch(() => null),
      api("/admin/transactions?limit=200", token).catch(() => []),
      api("/admin/applications/agents", token).catch(() => []),
      api("/admin/applications/merchants", token).catch(() => []),
      api("/admin/audit-log?limit=5", token).catch(() => []),
      api("/admin/users?limit=500", token).catch(() => []),
    ]).then(([s, txns, agents, merchants, audit, users]) => {
      setStats(s);
      setTransactions(txns ?? []);
      setAgentApps(agents ?? []);
      setMerchantApps(merchants ?? []);
      setAuditLog(audit ?? []);
      const map = {};
      (users ?? []).forEach(u => { map[u.id] = u.phone_number; });
      setUserMap(map);
    }).finally(() => setLoading(false));
  }, [token]);

  const pendingAgents    = agentApps.filter(a => a.status === "pending");
  const pendingMerchants = merchantApps.filter(a => a.status === "pending");
  const pendingTotal     = pendingAgents.length + pendingMerchants.length;

  const volByType = {};
  transactions.forEach(t => {
    const type = t.transaction_type ?? t.type;
    volByType[type] = (volByType[type] || 0) + parseFloat(t.amount || 0);
  });
  const totalVol = Object.values(volByType).reduce((a, b) => a + b, 0);

  const statCards = [
    {
      label: "Total customers",
      value: loading ? "—" : fmt(stats?.total_customers ?? 0),
      sub: `+${stats?.total_merchants ?? 0} merchants`,
      Icon: UsersIcon,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Active agents",
      value: loading ? "—" : fmt(stats?.active_agents ?? 0),
      sub: "Verified across Rwanda",
      Icon: CheckCircleIcon,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Transaction volume",
      value: loading ? "—" : fmtVol(totalVol) + " RWF",
      sub: `${transactions.length} transactions`,
      Icon: TrendingUpIcon,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      label: "Pending approvals",
      value: loading ? "—" : String(pendingTotal),
      sub: `${pendingAgents.length} agents · ${pendingMerchants.length} merchants`,
      Icon: ClockIcon,
      color: pendingTotal > 0 ? "text-amber-600" : "text-slate-400",
      bg: pendingTotal > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-800",
    },
  ];

  const recentApprovals = [...pendingAgents.map(a => ({ ...a, appType: "Agent" })), ...pendingMerchants.map(a => ({ ...a, appType: "Merchant" }))]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  return (
    <SidebarLayout pendingCount={pendingTotal}>
      <div className="p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-full">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">System overview</h1>
            <p className="text-slate-400 text-sm mt-0.5">Real-time health across all Ishimwe Bank operations.</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, sub, Icon, color, bg }) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-1">{label}</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
              <p className={`text-xs mt-1 font-medium ${pendingTotal > 0 && label === "Pending approvals" ? "text-amber-600" : "text-slate-400 dark:text-slate-500"}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Main grid: volume chart + right column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Transaction volume by type */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-900 dark:text-white">Transaction volume by type</h2>
            </div>
            {loading ? (
              <div className="space-y-4">{[0,1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
            ) : totalVol === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No transactions yet.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(volByType).map(([type, vol]) => {
                  const cfg = TYPE_META[type] ?? { bar: "bg-slate-400", label: type };
                  const pct = totalVol > 0 ? (vol / totalVol) * 100 : 0;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cfg.label}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{fmtVol(vol)} RWF</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full ${cfg.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pending approvals mini list */}
            {recentApprovals.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white">Pending approvals</h3>
                  <Link to="/admin/approvals" className="text-xs text-orange-500 font-semibold hover:underline">View all</Link>
                </div>
                <div className="space-y-3">
                  {recentApprovals.map(a => (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${a.appType === "Agent" ? "bg-blue-500" : "bg-orange-500"}`}>
                        {a.appType[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {a.appType} application{a.business_name ? ` — ${a.business_name}` : ""}
                        </p>
                        <p className="text-xs text-slate-400">Submitted {new Date(a.created_at).toLocaleDateString("en-RW")}</p>
                      </div>
                      <Link to="/admin/approvals"
                        className="shrink-0 bg-[#0B1D3E] dark:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800">
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: system alerts */}
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">System alerts</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">All systems operational</p>
                    <p className="text-xs text-slate-400">No downtime in the last 30 days</p>
                  </div>
                </div>
                {pendingTotal > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{pendingTotal} approval{pendingTotal !== 1 ? "s" : ""} pending</p>
                      <p className="text-xs text-slate-400">{pendingAgents.length} agent{pendingAgents.length !== 1 ? "s" : ""} · {pendingMerchants.length} merchant{pendingMerchants.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Audit log active</p>
                    <p className="text-xs text-slate-400">{auditLog.length} events recorded</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity table — full width, scrollable */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-white">Recent transactions</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">{transactions.length} total</span>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[0,1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-12">No transactions yet.</p>
          ) : (
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Time</th>
                    <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Type</th>
                    <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">From</th>
                    <th className="text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {transactions.map(t => {
                    const type = t.transaction_type ?? t.type ?? "";
                    const typeCfg = TYPE_META[type] ?? { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-600 dark:text-slate-300", label: type };
                    const statusCfg = STATUS_META[t.status] ?? { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-600 dark:text-slate-300" };
                    const phone = userMap[t.initiator_id] ?? `#${t.initiator_id}`;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">{fmtTime(t.created_at)}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${typeCfg.bg} ${typeCfg.text}`}>
                            {typeCfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-slate-700 dark:text-slate-300">{phone}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-right font-bold text-slate-900 dark:text-white">{fmt(parseFloat(t.amount))} <span className="text-slate-400 font-normal">RWF</span></td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </SidebarLayout>
  );
}
